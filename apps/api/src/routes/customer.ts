import { Router } from "express";
import { z } from "zod";
import { db, bookingInclude, tourInclude } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../http.js";
import {
  createBooking,
  pay,
  cancelBooking,
  cancellation,
  maintainBookings,
} from "../services/bookings.js";
export const customerRoutes = Router();
customerRoutes.use(authenticate);
customerRoutes.get(
  "/bookings",
  asyncRoute(async (req, res) => {
    await maintainBookings();
    res.json(
      await db.booking.findMany({
        where: { userId: req.auth!.id },
        include: bookingInclude,
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);
customerRoutes.post(
  "/bookings",
  asyncRoute(async (req, res) => {
    await maintainBookings();
    res.status(201).json(await createBooking(req.auth!.id, req.body));
  }),
);
customerRoutes.get(
  "/bookings/:id",
  asyncRoute(async (req, res) => {
    await maintainBookings();
    const booking = await db.booking.findFirst({
      where: {
        id: z.string().uuid().parse(req.params.id),
        userId: req.auth!.id,
      },
      include: bookingInclude,
    });
    if (!booking) throw new HttpError(404, "Booking not found.");
    res.json({ ...booking, cancellation: cancellation(booking) });
  }),
);
customerRoutes.post(
  "/bookings/:id/cancel",
  asyncRoute(async (req, res) =>
    res.json(
      await cancelBooking(req.auth!.id, z.string().uuid().parse(req.params.id)),
    ),
  ),
);
customerRoutes.post(
  "/payments/mock",
  asyncRoute(async (req, res) =>
    res.status(201).json(await pay(req.auth!.id, req.body)),
  ),
);
customerRoutes.get(
  "/payments/:id",
  asyncRoute(async (req, res) => {
    const payment = await db.payment.findFirst({
      where: {
        id: z.string().uuid().parse(req.params.id),
        booking: { userId: req.auth!.id },
      },
    });
    if (!payment) throw new HttpError(404, "Payment not found.");
    res.json(payment);
  }),
);
customerRoutes.get(
  "/wishlist",
  asyncRoute(async (req, res) => {
    res.json(
      await db.wishlistItem.findMany({
        where: { wishlist: { userId: req.auth!.id } },
        include: { tour: { include: tourInclude } },
      }),
    );
  }),
);
customerRoutes.post(
  "/wishlist",
  asyncRoute(async (req, res) => {
    const { tourId } = z.object({ tourId: z.string().uuid() }).parse(req.body);
    if (
      !(await db.tour.findFirst({ where: { id: tourId, status: "PUBLISHED" } }))
    )
      throw new HttpError(404, "Tour not found.");
    const wishlist = await db.wishlist.upsert({
      where: { userId: req.auth!.id },
      update: {},
      create: { userId: req.auth!.id },
    });
    res
      .status(201)
      .json(
        await db.wishlistItem.upsert({
          where: { wishlistId_tourId: { wishlistId: wishlist.id, tourId } },
          update: {},
          create: { wishlistId: wishlist.id, tourId },
        }),
      );
  }),
);
customerRoutes.delete(
  "/wishlist/:tourId",
  asyncRoute(async (req, res) => {
    await db.wishlistItem.deleteMany({
      where: {
        tourId: z.string().uuid().parse(req.params.tourId),
        wishlist: { userId: req.auth!.id },
      },
    });
    res.json({ ok: true });
  }),
);
customerRoutes.get(
  "/my-reviews",
  asyncRoute(async (req, res) =>
    res.json(
      await db.review.findMany({
        where: { userId: req.auth!.id },
        include: { tour: { select: { title: true } } },
      }),
    ),
  ),
);
customerRoutes.post(
  "/reviews",
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        bookingId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        title: z.string().min(3).max(100),
        comment: z.string().min(10).max(2000),
      })
      .parse(req.body);
    const booking = await db.booking.findFirst({
      where: { id: data.bookingId, userId: req.auth!.id, status: "COMPLETED" },
    });
    if (!booking)
      throw new HttpError(403, "Only completed trips can be reviewed.");
    res
      .status(201)
      .json(
        await db.review.create({
          data: { ...data, tourId: booking.tourId, userId: req.auth!.id },
        }),
      );
  }),
);
customerRoutes.get(
  "/notifications",
  asyncRoute(async (req, res) => {
    await maintainBookings();
    res.json(
      await db.notification.findMany({
        where: { userId: req.auth!.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );
  }),
);
customerRoutes.patch(
  "/notifications/:id/read",
  asyncRoute(async (req, res) => {
    const result = await db.notification.updateMany({
      where: {
        id: z.string().uuid().parse(req.params.id),
        userId: req.auth!.id,
      },
      data: { read: true },
    });
    if (!result.count) throw new HttpError(404, "Notification not found.");
    res.json({ ok: true });
  }),
);
