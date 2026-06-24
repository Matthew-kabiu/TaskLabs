import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
const internalApi = internal as any;

// Convex Auth HTTP routes (sign-in / sign-up / OAuth callbacks).
// Served on the SITE origin — self-hosted: CONVEX_SITE_ORIGIN (:3211).
auth.addHttpRoutes(http);

http.route({
  pathPrefix: "/telegram/webhook/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = new URL(request.url).pathname
      .replace(/^\/telegram\/webhook\//, "")
      .split("/")[0];
    if (userId.length < 1) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const expected = await ctx.runQuery(internalApi.telegram.getWebhookSecret, {
      userId,
    });
    const presented =
      request.headers.get("x-telegram-bot-api-secret-token") ?? "";
    if (
      expected === null ||
      presented.length !== expected.length ||
      presented !== expected
    ) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { message?: { text?: string; chat?: { id?: number | string } } }
      | null;
    const chatId = body?.message?.chat?.id;
    if (
      body?.message?.text === "/start" &&
      (typeof chatId === "number" || typeof chatId === "string")
    ) {
      await ctx.runMutation(internalApi.telegram.acceptWebhookStart, {
        userId,
        chatId: String(chatId),
      });
    }
    return Response.json({ ok: true });
  }),
});

export default http;
