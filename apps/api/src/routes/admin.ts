import { Router } from "express";
import { z } from "zod";
import { db, publicUser, tourInclude, bookingInclude } from "../db.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../http.js";
import { indexDocument } from "../services/ai.js";
import { cancelBooking, serializable } from "../services/bookings.js";
export const adminRoutes = Router();
adminRoutes.use(authenticate, adminOnly);
async function audit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
) {
  await db.auditLog.create({ data: { userId, action, entity, entityId } });
}
const tourSchema = z
  .object({
    title: z.string().min(3).max(150),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    description: z.string().min(20).max(10000),
    shortDescription: z.string().min(10).max(500),
    destinationId: z.string().uuid(),
    categoryId: z.string().uuid(),
    price: z.number().int().min(100).max(100000000),
    duration: z.number().int().min(1).max(90),
    minTravelers: z.number().int().min(1).max(30),
    maxTravelers: z.number().int().min(1).max(30),
    difficulty: z.enum(["Easy", "Moderate", "Challenging"]),
    meetingPoint: z.string().min(3),
    included: z.array(z.string()),
    excluded: z.array(z.string()),
    cancellationPolicy: z.string().min(10),
    cancellationDays: z.number().int().min(0).max(90),
    refundPercent: z.number().int().min(0).max(100),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    featured: z.boolean().default(false),
    image: z.string().url().optional(),
  })
  .refine((t) => t.minTravelers <= t.maxTravelers, {
    message: "Minimum travelers cannot exceed maximum.",
  });
adminRoutes.get(
  "/stats",
  asyncRoute(async (_req, res) => {
    const [
      users,
      tours,
      bookings,
      confirmed,
      cancelled,
      completed,
      revenue,
      upcoming,
    ] = await Promise.all([
      db.user.count(),
      db.tour.count(),
      db.booking.count(),
      db.booking.count({ where: { status: "CONFIRMED" } }),
      db.booking.count({ where: { status: "CANCELLED" } }),
      db.booking.count({ where: { status: "COMPLETED" } }),
      db.payment.groupBy({ by: ["status"], _sum: { amount: true } }),
      db.booking.count({
        where: { status: "CONFIRMED", travelDate: { gte: new Date() } },
      }),
    ]);
    res.json({
      users,
      tours,
      bookings,
      confirmed,
      cancelled,
      completed,
      revenue:
        (revenue.find((x) => x.status === "SUCCESS")?._sum.amount || 0) -
        (revenue.find((x) => x.status === "REFUNDED")?._sum.amount || 0),
      upcoming,
    });
  }),
);
adminRoutes.get(
  "/users",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.user.findMany({
        select: publicUser,
        orderBy: { createdAt: "desc" },
      }),
    ),
  ),
);
adminRoutes.patch(
  "/users/:id",
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        active: z.boolean().optional(),
        role: z.enum(["CUSTOMER", "ADMIN"]).optional(),
      })
      .parse(req.body);
    if (req.params.id === req.auth!.id)
      throw new HttpError(
        400,
        "You cannot change your own administrative access.",
      );
    const user = await db.user.update({
      where: { id: req.params.id },
      data: { ...data, tokenVersion: { increment: 1 } },
      select: publicUser,
    });
    await db.session.deleteMany({ where: { userId: user.id } });
    await audit(req.auth!.id, "UPDATE", "User", user.id);
    res.json(user);
  }),
);
adminRoutes.get(
  "/tours",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.tour.findMany({
        include: tourInclude,
        orderBy: { createdAt: "desc" },
      }),
    ),
  ),
);
adminRoutes.post(
  "/tours",
  asyncRoute(async (req, res) => {
    const { image, ...data } = tourSchema.parse(req.body);
    const tour = await db.tour.create({
      data: {
        ...data,
        ...(image
          ? { images: { create: { url: image, alt: data.title } } }
          : {}),
      },
      include: tourInclude,
    });
    await audit(req.auth!.id, "CREATE", "Tour", tour.id);
    res.status(201).json(tour);
  }),
);
adminRoutes.put(
  "/tours/:id",
  asyncRoute(async (req, res) => {
    const { image, ...data } = tourSchema.parse(req.body);
    const tour = await db.tour.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(image
          ? {
              images: {
                deleteMany: {},
                create: { url: image, alt: data.title },
              },
            }
          : {}),
      },
      include: tourInclude,
    });
    await audit(req.auth!.id, "UPDATE", "Tour", tour.id);
    res.json(tour);
  }),
);
adminRoutes.delete(
  "/tours/:id",
  asyncRoute(async (req, res) => {
    await db.tour.update({
      where: { id: req.params.id },
      data: { status: "ARCHIVED" },
    });
    await audit(req.auth!.id, "ARCHIVE", "Tour", req.params.id);
    res.json({ ok: true });
  }),
);
const destinationSchema = z.object({
  name: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
  description: z.string().min(10).max(3000),
  image: z.string().url(),
});
adminRoutes.get(
  "/destinations",
  asyncRoute(async (_req, res) => res.json(await db.destination.findMany())),
);
adminRoutes.post(
  "/destinations",
  asyncRoute(async (req, res) => {
    const item = await db.destination.create({
      data: destinationSchema.parse(req.body),
    });
    await audit(req.auth!.id, "CREATE", "Destination", item.id);
    res.status(201).json(item);
  }),
);
adminRoutes.put(
  "/destinations/:id",
  asyncRoute(async (req, res) => {
    res.json(
      await db.destination.update({
        where: { id: req.params.id },
        data: destinationSchema.parse(req.body),
      }),
    );
    await audit(req.auth!.id, "UPDATE", "Destination", req.params.id);
  }),
);
adminRoutes.delete(
  "/destinations/:id",
  asyncRoute(async (req, res) => {
    await db.destination.delete({ where: { id: req.params.id } });
    await audit(req.auth!.id, "DELETE", "Destination", req.params.id);
    res.json({ ok: true });
  }),
);
const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000),
});
adminRoutes.get(
  "/categories",
  asyncRoute(async (_req, res) => res.json(await db.tourCategory.findMany())),
);
adminRoutes.post(
  "/categories",
  asyncRoute(async (req, res) => {
    const item = await db.tourCategory.create({
      data: categorySchema.parse(req.body),
    });
    await audit(req.auth!.id, "CREATE", "TourCategory", item.id);
    res.status(201).json(item);
  }),
);
adminRoutes.put(
  "/categories/:id",
  asyncRoute(async (req, res) => {
    res.json(
      await db.tourCategory.update({
        where: { id: req.params.id },
        data: categorySchema.parse(req.body),
      }),
    );
    await audit(req.auth!.id, "UPDATE", "TourCategory", req.params.id);
  }),
);
adminRoutes.delete(
  "/categories/:id",
  asyncRoute(async (req, res) => {
    await db.tourCategory.delete({ where: { id: req.params.id } });
    await audit(req.auth!.id, "DELETE", "TourCategory", req.params.id);
    res.json({ ok: true });
  }),
);
adminRoutes.get(
  "/availability",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.tourAvailability.findMany({
        include: { tour: { select: { title: true } } },
        orderBy: { date: "asc" },
      }),
    ),
  ),
);
adminRoutes.post(
  "/availability",
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        tourId: z.string().uuid(),
        date: z.string().date(),
        capacity: z.number().int().min(1).max(500),
      })
      .parse(req.body);
    const slot = await db.tourAvailability.create({
      data: { ...data, date: new Date(data.date) },
    });
    await audit(req.auth!.id, "CREATE", "TourAvailability", slot.id);
    res.status(201).json(slot);
  }),
);
adminRoutes.patch(
  "/availability/:id",
  asyncRoute(async (req, res) => {
    const { capacity } = z
      .object({ capacity: z.number().int().min(1).max(500) })
      .parse(req.body);
    const result = await db.tourAvailability.updateMany({
      where: { id: req.params.id, reserved: { lte: capacity } },
      data: { capacity },
    });
    if (!result.count)
      throw new HttpError(409, "Capacity cannot be less than reserved places.");
    await audit(req.auth!.id, "UPDATE", "TourAvailability", req.params.id);
    res.json({ ok: true });
  }),
);
adminRoutes.delete(
  "/availability/:id",
  asyncRoute(async (req, res) => {
    await db.tourAvailability.delete({
      where: { id: req.params.id, reserved: 0, bookings: { none: {} } },
    });
    await audit(req.auth!.id, "DELETE", "TourAvailability", req.params.id);
    res.json({ ok: true });
  }),
);
adminRoutes.put(
  "/tours/:id/itinerary",
  asyncRoute(async (req, res) => {
    const data = z
      .array(
        z.object({
          day: z.number().int().min(1),
          title: z.string().min(3),
          description: z.string().min(10),
          meals: z.string(),
        }),
      )
      .min(1)
      .parse(req.body);
    await db.$transaction([
      db.itineraryDay.deleteMany({ where: { tourId: req.params.id } }),
      db.itineraryDay.createMany({
        data: data.map((d) => ({ ...d, tourId: req.params.id })),
      }),
    ]);
    await audit(req.auth!.id, "UPDATE", "ItineraryDay", req.params.id);
    res.json({ ok: true });
  }),
);
adminRoutes.put(
  "/tours/:id/hotels",
  asyncRoute(async (req, res) => {
    const data = z
      .array(
        z.object({
          name: z.string().min(3),
          address: z.string().min(3),
          stars: z.number().int().min(1).max(5),
        }),
      )
      .parse(req.body);
    await db.$transaction([
      db.hotel.deleteMany({ where: { tourId: req.params.id } }),
      db.hotel.createMany({
        data: data.map((h) => ({ ...h, tourId: req.params.id })),
      }),
    ]);
    await audit(req.auth!.id, "UPDATE", "Hotel", req.params.id);
    res.json({ ok: true });
  }),
);
adminRoutes.get(
  "/bookings",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.booking.findMany({
        include: { ...bookingInclude, user: { select: publicUser } },
        orderBy: { createdAt: "desc" },
      }),
    ),
  ),
);
adminRoutes.patch(
  "/bookings/:id",
  asyncRoute(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["CANCELLED", "COMPLETED"]) })
      .parse(req.body);
    if (status === "CANCELLED") {
      res.json(await cancelBooking(req.auth!.id, req.params.id, true));
    } else {
      res.json(
        await serializable(async (tx) => {
          const booking = await tx.booking.findUniqueOrThrow({
            where: { id: req.params.id },
            include: { tour: true },
          });
          if (
            booking.status !== "CONFIRMED" ||
            booking.travelDate.getTime() + booking.tour.duration * 86400000 >
              Date.now()
          )
            throw new HttpError(
              400,
              "Only finished, confirmed trips can be completed.",
            );
          return tx.booking.update({
            where: { id: booking.id },
            data: { status: "COMPLETED" },
          });
        }),
      );
    }
    await audit(req.auth!.id, status, "Booking", req.params.id);
  }),
);
adminRoutes.get(
  "/reviews",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.review.findMany({
        include: {
          user: { select: publicUser },
          tour: { select: { title: true } },
        },
      }),
    ),
  ),
);
adminRoutes.patch(
  "/reviews/:id",
  asyncRoute(async (req, res) => {
    const data = z.object({ visible: z.boolean() }).parse(req.body);
    res.json(await db.review.update({ where: { id: req.params.id }, data }));
    await audit(req.auth!.id, "MODERATE", "Review", req.params.id);
  }),
);
const documentSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(20).max(100000),
  type: z.string().max(50),
  ownerId: z.string().uuid().nullable().default(null),
});
adminRoutes.get(
  "/rag/documents",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.rAGDocument.findMany({
        include: { _count: { select: { chunks: true } } },
        orderBy: { updatedAt: "desc" },
      }),
    ),
  ),
);
adminRoutes.post(
  "/rag/documents",
  asyncRoute(async (req, res) => {
    const doc = await db.rAGDocument.create({
      data: documentSchema.parse(req.body),
    });
    await audit(req.auth!.id, "CREATE", "RAGDocument", doc.id);
    res.status(201).json(doc);
  }),
);
adminRoutes.put(
  "/rag/documents/:id",
  asyncRoute(async (req, res) => {
    const data = documentSchema.parse(req.body);
    const doc = await db.$transaction(async (tx) => {
      await tx.rAGChunk.deleteMany({ where: { documentId: req.params.id } });
      return tx.rAGDocument.update({
        where: { id: req.params.id },
        data: { ...data, status: "PENDING", indexedAt: null },
      });
    });
    await audit(req.auth!.id, "UPDATE", "RAGDocument", doc.id);
    res.json(doc);
  }),
);
adminRoutes.delete(
  "/rag/documents/:id",
  asyncRoute(async (req, res) => {
    await db.rAGDocument.delete({ where: { id: req.params.id } });
    await audit(req.auth!.id, "DELETE", "RAGDocument", req.params.id);
    res.json({ ok: true });
  }),
);
adminRoutes.post(
  "/rag/reindex",
  asyncRoute(async (req, res) => {
    const { documentId } = z
      .object({ documentId: z.string().uuid().optional() })
      .parse(req.body);
    const docs = await db.rAGDocument.findMany({
      where: documentId ? { id: documentId } : {},
      select: { id: true },
    });
    if (documentId && !docs.length)
      throw new HttpError(404, "Document not found.");
    const results = [];
    for (const doc of docs) {
      try {
        results.push({ id: doc.id, ...(await indexDocument(doc.id)) });
      } catch (error) {
        results.push({
          id: doc.id,
          error: error instanceof Error ? error.message : "Index failed",
        });
      }
    }
    await audit(req.auth!.id, "REINDEX", "RAGDocument", documentId);
    res.json({ results });
  }),
);
adminRoutes.get(
  "/notifications",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.notification.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ),
  ),
);
adminRoutes.post(
  "/notifications",
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        userId: z.string().uuid(),
        title: z.string().min(3).max(150),
        message: z.string().min(3).max(1000),
      })
      .parse(req.body);
    const item = await db.notification.create({
      data: { ...data, type: "ADMIN_MESSAGE" },
    });
    await audit(req.auth!.id, "CREATE", "Notification", item.id);
    res.status(201).json(item);
  }),
);
adminRoutes.get(
  "/audit-logs",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.auditLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ),
  ),
);
adminRoutes.get(
  "/contacts",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ),
  ),
);
