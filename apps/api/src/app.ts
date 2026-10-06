import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { config, allowedOrigins } from "./config.js";
import { db } from "./db.js";
import { errorHandler, asyncRoute } from "./http.js";
import { originGuard } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { customerRoutes } from "./routes/customer.js";
import { adminRoutes } from "./routes/admin.js";
import { chatRoutes } from "./routes/chat.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.TRUST_PROXY_HOPS);
app.use(
  helmet(),
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
  express.json({ limit: "256kb" }),
  cookieParser(),
  originGuard,
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.get("/api/live", (_req, res) => res.json({ status: "ok" }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.get(
  "/api/health",
  asyncRoute(async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", customerRoutes);
app.use((_req, res) => {
  res.status(404).json({ message: "Endpoint not found." });
});
app.use(errorHandler);
