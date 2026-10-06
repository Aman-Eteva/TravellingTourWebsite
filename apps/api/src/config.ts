import dotenv from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";
dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), "../../.env") });
export const environmentSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    CLIENT_URL: z
      .string()
      .url()
      .default("http://localhost:5173")
      .transform((value) => new URL(value).origin),
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().default("development"),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    AI_PROVIDER: z.literal("ollama").default("ollama"),
    OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
    OLLAMA_CHAT_MODEL: z.string().default("qwen2.5:1.5b"),
    OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_FROM: z.string().default("hello@roamly.local"),
    SMTP_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;
    if (!value.CLIENT_URL.startsWith("https://"))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLIENT_URL"],
        message: "Production requires an HTTPS origin.",
      });
    for (const field of ["JWT_SECRET", "JWT_REFRESH_SECRET"] as const)
      if (/replace|change.me|example/i.test(value[field]))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Set a generated production secret.",
        });
    if (value.JWT_SECRET === value.JWT_REFRESH_SECRET)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "Access and refresh secrets must differ.",
      });
  });

export const config = environmentSchema.parse(process.env);

export const allowedOrigins = [config.CLIENT_URL];
if (config.NODE_ENV !== "production") {
  const origin = new URL(config.CLIENT_URL);
  if (origin.hostname === "localhost" || origin.hostname === "127.0.0.1") {
    origin.hostname =
      origin.hostname === "localhost" ? "127.0.0.1" : "localhost";
    allowedOrigins.push(origin.origin);
  }
}
