import packageMetadata from '@/package.json';

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

export function deploymentIdentity(
  environment = process.env.NODE_ENV,
  origin = siteOrigin(),
): { version: string; environment: 'DEV' | 'PROD'; origin: string } {
  const production = environment === 'production';
  let originLabel = 'LOCALHOST:3000';

  if (production) {
    try {
      const labels = new URL(origin).hostname.split('.').filter(Boolean);
      originLabel = (labels.at(-2) ?? labels[0] ?? '').toUpperCase();
    } catch {
      originLabel = '';
    }
  }

  return {
    version: `V${packageMetadata.version}`,
    environment: production ? 'PROD' : 'DEV',
    origin: originLabel,
  };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split('@');
  if (!local || !domain) throw new Error('ADMIN_SUPPORT_EMAIL must be a valid email address');
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}${'•'.repeat(Math.max(4, local.length - visible.length))}@${domain}`;
}
