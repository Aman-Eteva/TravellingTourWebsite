import "./config.js";
import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient();
export const publicUser = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
} as const;
export const tourInclude = {
  destination: true,
  category: true,
  images: { orderBy: { position: "asc" as const } },
  itinerary: { orderBy: { day: "asc" as const } },
  hotels: true,
  activities: true,
  availability: { orderBy: { date: "asc" as const } },
  reviews: {
    where: { visible: true },
    include: { user: { select: { name: true } } },
  },
} as const;
export const bookingInclude = {
  tour: { include: tourInclude },
  travelers: true,
  payments: true,
  review: true,
} as const;
