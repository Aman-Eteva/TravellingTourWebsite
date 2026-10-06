import { Prisma, type Booking, type Tour } from "@prisma/client";
import { z } from "zod";
import { db, bookingInclude } from "../db.js";
import { HttpError } from "../http.js";
export const bookingSchema = z.object({
  tourId: z.string().uuid(),
  availabilityId: z.string().uuid(),
  travelers: z
    .array(
      z.object({
        name: z.string().min(2).max(100),
        age: z.number().int().min(0).max(120),
        email: z.string().email().optional(),
      }),
    )
    .min(1)
    .max(30),
});
export async function serializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let i = 0; i < 4; i++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        i < 3
      )
        continue;
      throw error;
    }
  }
  throw new HttpError(409, "Please retry your request.");
}
export function cancellation(booking: Booking & { tour: Tour }) {
  const deadline = new Date(
    booking.travelDate.getTime() - booking.tour.cancellationDays * 86400000,
  );
  return {
    eligible:
      ["PENDING", "CONFIRMED"].includes(booking.status) &&
      new Date() < deadline,
    deadline,
    estimatedRefund:
      booking.paymentStatus === "SUCCESS"
        ? Math.round((booking.total * booking.tour.refundPercent) / 100)
        : 0,
  };
}
export async function createBooking(userId: string, input: unknown) {
  const data = bookingSchema.parse(input);
  return serializable(async (tx) => {
    const tour = await tx.tour.findFirst({
      where: { id: data.tourId, status: "PUBLISHED" },
    });
    if (!tour) throw new HttpError(404, "Tour not found.");
    const count = data.travelers.length;
    if (count < tour.minTravelers || count > tour.maxTravelers)
      throw new HttpError(
        400,
        `Choose ${tour.minTravelers}–${tour.maxTravelers} travelers.`,
      );
    const slot = await tx.tourAvailability.findFirst({
      where: {
        id: data.availabilityId,
        tourId: tour.id,
        date: { gt: new Date() },
      },
    });
    if (!slot) throw new HttpError(400, "Choose a future departure.");
    const changed = await tx.tourAvailability.updateMany({
      where: { id: slot.id, reserved: { lte: slot.capacity - count } },
      data: { reserved: { increment: count } },
    });
    if (changed.count !== 1)
      throw new HttpError(409, "Not enough places remain on this departure.");
    const booking = await tx.booking.create({
      data: {
        reference: `TEMP-${crypto.randomUUID()}`,
        userId,
        tourId: tour.id,
        availabilityId: slot.id,
        travelDate: slot.date,
        count,
        subtotal: tour.price * count,
        total: tour.price * count,
        expiresAt: new Date(Date.now() + 30 * 60000),
        travelers: { create: data.travelers },
      },
    });
    return tx.booking.update({
      where: { id: booking.id },
      data: {
        reference: `TRV-${new Date().getUTCFullYear()}-${String(booking.sequence).padStart(6, "0")}`,
      },
      include: bookingInclude,
    });
  });
}
export async function pay(userId: string, input: unknown) {
  const data = z
    .object({
      bookingId: z.string().uuid(),
      status: z.enum(["SUCCESS", "FAILED", "PENDING"]),
      idempotencyKey: z.string().uuid(),
    })
    .parse(input);
  return serializable(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: data.bookingId, userId },
    });
    if (!booking) throw new HttpError(404, "Booking not found.");
    const existing = await tx.payment.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existing) {
      if (existing.bookingId !== booking.id || existing.status !== data.status)
        throw new HttpError(409, "Payment request conflict.");
      return existing;
    }
    if (
      booking.status !== "PENDING" ||
      !booking.expiresAt ||
      booking.expiresAt <= new Date()
    )
      throw new HttpError(409, "This booking can no longer be paid.");
    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.total,
        status: data.status,
        idempotencyKey: data.idempotencyKey,
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: data.status,
        status: data.status === "SUCCESS" ? "CONFIRMED" : "PENDING",
        expiresAt: data.status === "SUCCESS" ? null : booking.expiresAt,
      },
    });
    if (data.status === "SUCCESS")
      await tx.notification.createMany({
        data: [
          {
            userId,
            title: "Your adventure is confirmed",
            message: `${booking.reference} is ready. Find your itinerary in My trips.`,
            type: "BOOKING_CONFIRMATION",
            link: `/bookings/${booking.id}`,
          },
          {
            userId,
            title: "Demo payment successful",
            message: `Your mock payment of ₹${(booking.total / 100).toLocaleString("en-IN")} was recorded. No money was charged.`,
            type: "PAYMENT_SUCCESS",
            link: `/bookings/${booking.id}`,
          },
        ],
      });
    return payment;
  });
}
export async function cancelBooking(userId: string, id: string, admin = false) {
  return serializable(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id, ...(!admin ? { userId } : {}) },
      include: { tour: true },
    });
    if (!booking) throw new HttpError(404, "Booking not found.");
    const policy = cancellation(booking);
    if (!policy.eligible)
      throw new HttpError(
        400,
        "This booking is outside its cancellation window.",
      );
    await tx.tourAvailability.update({
      where: { id: booking.availabilityId },
      data: { reserved: { decrement: booking.count } },
    });
    if (policy.estimatedRefund > 0)
      await tx.payment.create({
        data: {
          bookingId: id,
          amount: policy.estimatedRefund,
          status: "REFUNDED",
          idempotencyKey: crypto.randomUUID(),
        },
      });
    const result = await tx.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        refund: policy.estimatedRefund,
        paymentStatus:
          policy.estimatedRefund > 0 ? "REFUNDED" : booking.paymentStatus,
      },
      include: bookingInclude,
    });
    await tx.notification.create({
      data: {
        userId: booking.userId,
        title: "Booking cancelled",
        message: `${booking.reference} was cancelled. Mock refund: ₹${policy.estimatedRefund / 100}.`,
        type: "BOOKING_CANCELLATION",
        link: `/bookings/${id}`,
      },
    });
    return result;
  });
}
export async function maintainBookings() {
  await serializable(async (tx) => {
    const expired = await tx.booking.findMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
    });
    for (const booking of expired) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await tx.tourAvailability.update({
        where: { id: booking.availabilityId },
        data: { reserved: { decrement: booking.count } },
      });
    }
    const confirmed = await tx.booking.findMany({
      where: { status: "CONFIRMED" },
      include: { tour: true },
    });
    for (const booking of confirmed) {
      const days = (booking.travelDate.getTime() - Date.now()) / 86400000;
      let type: string | undefined;
      if (days < -booking.tour.duration) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "COMPLETED" },
        });
        type = "REVIEW_REMINDER";
      } else if (days >= 0 && days <= 1) type = "TRIP_REMINDER";
      else if (days > 1 && days <= 7) type = "UPCOMING_TRIP";
      if (type)
        await tx.notification.upsert({
          where: { dedupeKey: `${booking.id}:${type}` },
          update: {},
          create: {
            userId: booking.userId,
            dedupeKey: `${booking.id}:${type}`,
            type,
            title:
              type === "REVIEW_REMINDER"
                ? "How was your adventure?"
                : "Your adventure is coming up",
            message:
              type === "REVIEW_REMINDER"
                ? `Share your experience of ${booking.tour.title}.`
                : `${booking.tour.title} departs on ${booking.travelDate.toISOString().slice(0, 10)}.`,
            link: `/bookings/${booking.id}`,
          },
        });
    }
  });
}
