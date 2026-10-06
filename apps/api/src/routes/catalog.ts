import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db, tourInclude } from "../db.js";
import { asyncRoute, HttpError } from "../http.js";
export const catalogRoutes = Router();
catalogRoutes.get(
  "/tours",
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        search: z.string().max(150).optional(),
        destination: z.string().optional(),
        category: z.string().optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        duration: z.coerce.number().int().min(1).optional(),
        date: z.string().date().optional(),
        available: z.enum(["true", "false"]).optional(),
        sort: z
          .enum(["price-asc", "price-desc", "newest", "duration"])
          .default("newest"),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(9),
        featured: z.enum(["true", "false"]).optional(),
      })
      .parse(req.query);
    const where: Prisma.TourWhereInput = {
      status: "PUBLISHED",
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: "insensitive" } },
              { description: { contains: q.search, mode: "insensitive" } },
              {
                destination: {
                  name: { contains: q.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
      ...(q.destination ? { destinationId: q.destination } : {}),
      ...(q.category ? { categoryId: q.category } : {}),
      price: {
        gte:
          q.minPrice === undefined ? undefined : Math.round(q.minPrice * 100),
        lte:
          q.maxPrice === undefined ? undefined : Math.round(q.maxPrice * 100),
      },
      ...(q.duration ? { duration: { lte: q.duration } } : {}),
      ...(q.featured === "true" ? { featured: true } : {}),
    };
    if (q.date || q.available === "true") {
      const slots = await db.$queryRaw<
        { tourId: string }[]
      >`SELECT DISTINCT "tourId" FROM "TourAvailability" WHERE "reserved" < "capacity" AND "date" > CURRENT_DATE AND (${q.date ?? null}::date IS NULL OR "date" = ${q.date ?? null}::date)`;
      where.id = { in: slots.map((s) => s.tourId) };
    }
    const orderBy: Prisma.TourOrderByWithRelationInput =
      q.sort === "price-asc"
        ? { price: "asc" }
        : q.sort === "price-desc"
          ? { price: "desc" }
          : q.sort === "duration"
            ? { duration: "asc" }
            : { createdAt: "desc" };
    const [items, total] = await Promise.all([
      db.tour.findMany({
        where,
        include: tourInclude,
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      db.tour.count({ where }),
    ]);
    res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
  }),
);
catalogRoutes.get(
  "/tours/:id",
  asyncRoute(async (req, res) => {
    const id = req.params.id;
    const tour = await db.tour.findFirst({
      where: {
        status: "PUBLISHED",
        ...(z.string().uuid().safeParse(id).success ? { id } : { slug: id }),
      },
      include: tourInclude,
    });
    if (!tour) throw new HttpError(404, "Tour not found.");
    res.json(tour);
  }),
);
catalogRoutes.get(
  "/destinations",
  asyncRoute(async (_req, res) =>
    res.json(
      await db.destination.findMany({
        include: { _count: { select: { tours: true } } },
      }),
    ),
  ),
);
catalogRoutes.get(
  "/categories",
  asyncRoute(async (_req, res) => res.json(await db.tourCategory.findMany())),
);
catalogRoutes.get(
  "/reviews",
  asyncRoute(async (req, res) => {
    const tourId = z.string().uuid().optional().parse(req.query.tourId);
    res.json(
      await db.review.findMany({
        where: { visible: true, ...(tourId ? { tourId } : {}) },
        include: {
          user: { select: { name: true } },
          tour: { select: { title: true } },
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);
catalogRoutes.post(
  "/contact",
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        message: z.string().min(10).max(3000),
      })
      .parse(req.body);
    await db.contactMessage.create({ data });
    res
      .status(201)
      .json({
        message: "Thanks for reaching out. Your message has been received.",
      });
  }),
);
