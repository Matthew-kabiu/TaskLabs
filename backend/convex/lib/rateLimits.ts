import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const tasklabsRateLimiter = new RateLimiter(components.rateLimiter, {
  apiKeyManagement: {
    kind: "token bucket",
    rate: 20,
    period: HOUR,
    capacity: 5,
  },
  apiKeyVerify: {
    kind: "token bucket",
    rate: 120,
    period: MINUTE,
    capacity: 30,
  },
});
