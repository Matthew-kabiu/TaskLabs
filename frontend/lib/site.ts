export const SITE_NAME = 'TaskLabs';

export const SITE_DESCRIPTION =
  'Self-hosted task and calendar manager for teams. Kanban boards, a shared calendar, realtime updates, and Telegram reminders on infrastructure you control.';

export function siteOrigin(): string {
  return process.env.FRONTEND_ORIGIN ?? '';
}

export function absoluteUrl(path: string): string {
  const origin = siteOrigin();
  if (!origin) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function siteMetadataBase(): URL | null {
  const origin = siteOrigin();
  if (!origin) return null;
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}
