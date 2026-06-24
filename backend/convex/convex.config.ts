import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

/**
 * App-level component registration. The rate-limiter component replaces the
 * old Redis token-bucket limiter — it is transactional, app-layer, and
 * fails closed. Define concrete limits in a shared module (e.g. convex/lib/rateLimits.ts).
 */
const app = defineApp();
app.use(rateLimiter);

export default app;
