import { Router, type Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { rateLimit } from "express-rate-limit";
import { db, publicUser } from "../db.js";
import { config } from "../config.js";
import { asyncRoute, HttpError } from "../http.js";
import { authenticate } from "../middleware/auth.js";
export const authRoutes = Router();
const password = z.string().min(10).max(72);
const credentials = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
  password,
});
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const cookie = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api",
};
async function issue(
  user: { id: string; tokenVersion: number },
  res: Response,
) {
  const sid = crypto.randomUUID();
  const refresh = jwt.sign(
    { sid, v: user.tokenVersion },
    config.JWT_REFRESH_SECRET,
    {
      subject: user.id,
      expiresIn: "7d",
      issuer: "roamly",
      audience: "roamly-refresh",
    },
  );
  await db.session.create({
    data: {
      id: sid,
      userId: user.id,
      tokenHash: hash(refresh),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  const access = jwt.sign({ sid, v: user.tokenVersion }, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: "15m",
    issuer: "roamly",
    audience: "roamly-web",
  });
  res.cookie("access", access, { ...cookie, maxAge: 900000 });
  res.cookie("refresh", refresh, { ...cookie, maxAge: 7 * 86400000 });
}
authRoutes.use(
  rateLimit({
    windowMs: 900000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
authRoutes.post(
  "/register",
  asyncRoute(async (req, res) => {
    const data = credentials
      .extend({ name: z.string().min(2).max(100) })
      .parse(req.body);
    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: await bcrypt.hash(data.password, 12),
        wishlist: { create: {} },
      },
    });
    await issue(user, res);
    res.status(201).json(
      await db.user.findUnique({
        where: { id: user.id },
        select: publicUser,
      }),
    );
  }),
);
authRoutes.post(
  "/login",
  asyncRoute(async (req, res) => {
    const data = credentials.parse(req.body);
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (
      !user?.active ||
      !(await bcrypt.compare(data.password, user.passwordHash))
    )
      throw new HttpError(401, "Incorrect email or password.");
    await issue(user, res);
    res.json(
      await db.user.findUnique({ where: { id: user.id }, select: publicUser }),
    );
  }),
);
authRoutes.post(
  "/refresh",
  asyncRoute(async (req, res) => {
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(
        req.cookies.refresh || "",
        config.JWT_REFRESH_SECRET,
        { algorithms: ["HS256"], issuer: "roamly", audience: "roamly-refresh" },
      ) as jwt.JwtPayload;
    } catch {
      throw new HttpError(401, "Session expired.");
    }
    const session = await db.session.findFirst({
      where: {
        id: payload.sid,
        tokenHash: hash(req.cookies.refresh),
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!session?.user.active || session.user.tokenVersion !== payload.v)
      throw new HttpError(401, "Session expired.");
    const removed = await db.session.deleteMany({
      where: { id: session.id, tokenHash: hash(req.cookies.refresh) },
    });
    if (removed.count !== 1)
      throw new HttpError(401, "Session already renewed.");
    await issue(session.user, res);
    res.json({ ok: true });
  }),
);
authRoutes.post(
  "/logout",
  asyncRoute(async (req, res) => {
    if (req.cookies.refresh)
      await db.session.deleteMany({
        where: { tokenHash: hash(req.cookies.refresh) },
      });
    res.clearCookie("access", cookie);
    res.clearCookie("refresh", cookie);
    res.json({ ok: true });
  }),
);
authRoutes.get(
  "/me",
  authenticate,
  asyncRoute(async (req, res) => {
    res.json(
      await db.user.findUnique({
        where: { id: req.auth!.id },
        select: publicUser,
      }),
    );
  }),
);
authRoutes.patch(
  "/profile",
  authenticate,
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        name: z.string().min(2).max(100),
        phone: z.string().max(30).optional(),
      })
      .parse(req.body);
    res.json(
      await db.user.update({
        where: { id: req.auth!.id },
        data,
        select: publicUser,
      }),
    );
  }),
);
authRoutes.post(
  "/change-password",
  authenticate,
  asyncRoute(async (req, res) => {
    const data = z
      .object({ currentPassword: z.string(), password })
      .parse(req.body);
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.auth!.id },
    });
    if (!(await bcrypt.compare(data.currentPassword, user.passwordHash)))
      throw new HttpError(400, "Current password is incorrect.");
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(data.password, 12),
          tokenVersion: { increment: 1 },
        },
      }),
      db.session.deleteMany({ where: { userId: user.id } }),
    ]);
    res.clearCookie("access", cookie);
    res.clearCookie("refresh", cookie);
    res.json({ ok: true });
  }),
);
authRoutes.post(
  "/forgot-password",
  asyncRoute(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const reset = await db.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: hash(token),
          expiresAt: new Date(Date.now() + 1800000),
        },
      });
      try {
        await nodemailer
          .createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE,
            ...(config.SMTP_USER && config.SMTP_PASSWORD
              ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } }
              : {}),
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          })
          .sendMail({
            from: config.SMTP_FROM,
            to: user.email,
            subject: "Reset your Roamly password",
            text: `Reset your password within 30 minutes: ${config.CLIENT_URL}/reset-password?token=${token}`,
          });
      } catch {
        await db.passwordReset.delete({ where: { id: reset.id } });
        console.error(
          "Password reset email could not be delivered. Check local SMTP.",
        );
      }
    }
    res.json({
      message: "If an account exists, a password reset email has been sent.",
    });
  }),
);
authRoutes.post(
  "/reset-password",
  asyncRoute(async (req, res) => {
    const data = z
      .object({ token: z.string().min(32), password })
      .parse(req.body);
    await db.$transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({
        where: { tokenHash: hash(data.token) },
      });
      if (!reset || reset.expiresAt < new Date())
        throw new HttpError(400, "This reset link is invalid or expired.");
      await tx.passwordReset.delete({ where: { id: reset.id } });
      await tx.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: await bcrypt.hash(data.password, 12),
          tokenVersion: { increment: 1 },
        },
      });
      await tx.session.deleteMany({ where: { userId: reset.userId } });
    });
    res.json({ ok: true });
  }),
);
