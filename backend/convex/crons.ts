import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled jobs.
 *
 * Telegram reminders are primarily scheduled ON DEMAND via
 * `ctx.scheduler.runAt(dueTime - leadMs, internal.reminders.fire, {...})`
 * when a task/event with a due date is created or updated — this replaces the
 * old node-cron worker that polled the DB.
 *
 * This cron file is reserved for periodic sweeps (e.g. a safety-net reminder
 * reconciliation). Wire entries to internalMutation/internalAction targets.
 */
const crons = cronJobs();

// Ice RAG safety net: documents stuck in indexing return to pending and the
// pending counters are recomputed. Embedding itself runs in the Next.js
// worker; this cron only repairs bookkeeping.
crons.hourly("rag-sweep-stale", { minuteUTC: 17 }, internal.rag.sweep, {});

// Example (enable once the reminders module exists):
// crons.interval("reminder-sweep", { minutes: 1 }, internal.reminders.sweep, {});

export default crons;
