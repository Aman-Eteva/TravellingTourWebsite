import { type RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { config, allowedOrigins } from "../config.js";
import { db } from "../db.js";
declare global {
  namespace Express {
    interface Request {
      auth?: { id: string; role: Role; sessionId: string };
    }
  }
}
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const payload = jwt.verify(req.cookies.access || "", config.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "roamly",
      audience: "roamly-web",
    }) as jwt.JwtPayload;
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, active: true, tokenVersion: true },
    });
    const session = await db.session.findFirst({
      where: {
        id: payload.sid,
        userId: user?.id,
        expiresAt: { gt: new Date() },
      },
    });
    if (!user?.active || !session || user.tokenVersion !== payload.v) {
      res.status(401).json({ message: "Please sign in to continue." });
      return;
    }
    req.auth = { id: user.id, role: user.role, sessionId: session.id };
    next();
  } catch {
    res.status(401).json({ message: "Please sign in to continue." });
  }
};
export const adminOnly: RequestHandler = (req, res, next) => {
  if (req.auth?.role !== "ADMIN") {
    res.status(403).json({ message: "Administrator access required." });
    return;
  }
  next();
};
export const originGuard: RequestHandler = (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && !allowedOrigins.includes(origin)) {
      res.status(403).json({ message: "Untrusted request origin." });
      return;
    }
  }
  next();
};
