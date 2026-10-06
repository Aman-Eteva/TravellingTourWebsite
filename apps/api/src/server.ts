import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { maintainBookings } from "./services/bookings.js";
let connected = false;
for (let i = 0; i < 30; i++) {
  try {
    await db.$connect();
    connected = true;
    break;
  } catch {
    if (i < 29) {
      if (i % 3 === 0) console.log("Waiting for database to be ready...");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
if (!connected) {
  console.error("Could not connect to database after 30 seconds.");
  process.exit(1);
}
const server = app.listen(config.PORT, "0.0.0.0", () =>
  console.log(`Roamly API listening on ${config.PORT}`),
);
let maintenance: Promise<void> | undefined;
const timer = setInterval(() => {
  if (maintenance) return;
  maintenance = maintainBookings()
    .catch(() => console.error("Booking maintenance failed; will retry."))
    .finally(() => {
      maintenance = undefined;
    });
}, 60000);
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(timer);
  const deadline = setTimeout(() => process.exit(1), 25000);
  deadline.unref();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await maintenance;
  await db.$disconnect();
  clearTimeout(deadline);
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
