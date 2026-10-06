import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config();
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: process.env.CLIENT_URL || "http://localhost:5173",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  reporter: "list",
});
