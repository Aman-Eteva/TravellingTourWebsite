import {
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    res
      .status(400)
      .json({
        message: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status =
      error.code === "P2002" ? 409 : error.code === "P2025" ? 404 : 400;
    res
      .status(status)
      .json({
        message:
          status === 409
            ? "This record already exists."
            : status === 404
              ? "Record not found."
              : "The requested change conflicts with existing data.",
      });
    return;
  }
  console.error(
    error instanceof Error ? error.message : "Unhandled server error",
  );
  res.status(500).json({ message: "Something went wrong. Please try again." });
}
