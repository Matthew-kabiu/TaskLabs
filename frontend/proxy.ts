import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Replaces the old NextAuth/Edge middleware. Convex Auth handles the session;
// SSE/Redis/bot-blocking logic is gone (reactivity + app-layer rate limiter take over).
const isAuthPage = createRouteMatcher(["/login", "/register"]);
const isProtected = createRouteMatcher([
  "/tasks(.*)",
  "/calendar(.*)",
  "/notifications(.*)",
  "/settings(.*)",
]);

export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();
  if (isAuthPage(request) && authed) return nextjsMiddlewareRedirect(request, "/tasks");
  if (isProtected(request) && !authed) return nextjsMiddlewareRedirect(request, "/login");
}, { convexUrl: process.env.CONVEX_SERVER_URL });

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
