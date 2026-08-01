import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site';
import {
  DocsH1,
  DocsH2,
  DocsLead,
  DocsList,
  DocsP,
} from '@/components/docs/primitives';

export const metadata: Metadata = {
  title: 'Production — TaskLabs docs',
  description:
    'Deploy TaskLabs behind a proxy, run daily encrypted backups, and keep secrets out of the repository.',
  alternates: { canonical: absoluteUrl('/docs/deployment') },
};

export default function DocsDeploymentPage() {
  return (
    <>
      <DocsH1>Production</DocsH1>
      <DocsLead>
        Ship TaskLabs behind Dokploy + Cloudflare Tunnel with automated daily
        backups to S3-compatible storage.
      </DocsLead>

      <DocsH2 id="stack">The production stack</DocsH2>
      <DocsP>
        Production runs the same product shape as development: the Next.js
        frontend, the self-hosted Convex backend, Convex storage on Postgres,
        the dashboard, and a <code>db-backup</code> scheduler. The only
        intentional dev difference is hot reload — production has no watcher
        services, no source bind mounts, and no <code>pnpm dev</code>.
      </DocsP>
      <DocsList
        items={[
          <>The frontend starts with <code>next start</code> on an explicit host and internal port.</>,
          <>A build-time <code>NEXT_TURBOPACK_ROOT</code> lets Next resolve the monorepo root and sibling Convex imports.</>,
          <>The dashboard stays internal — reach it over an SSH tunnel, never a public domain.</>,
          <>All five prod services are health-checked by Compose.</>,
        ]}
      />

      <DocsH2 id="origins">Origins & CORS</DocsH2>
      <DocsP>
        Public domains map to container ports: the frontend, the Convex API, and
        the Convex site proxy each get their own subdomain. <code>FRONTEND_ORIGIN</code>{' '}
        and <code>CORS_ALLOWED_ORIGINS</code> list these exact HTTPS origins, and{' '}
        <code>CORS_ALLOWED_ORIGINS</code> also accepts proxy-forwarded public
        hosts for Cloudflare/Dokploy.
      </DocsP>

      <DocsH2 id="backups">Daily backups</DocsH2>
      <DocsP>
        The <code>db-backup</code> service runs a Postgres-only{' '}
        <code>pg_dump --format custom</code> at midnight EAT, uploads the dump to
        the configured RustFS bucket via the S3 API, and sends a Telegram
        confirmation with backup-specific bot credentials. Dev carries the same
        service behind a <code>backup</code> profile to keep stack parity
        without running scheduled dumps during hot reload.
      </DocsP>
      <DocsList
        items={[
          <>RustFS endpoint, region, and access keys come from <code>.env</code> — never from source code.</>,
          <>The healthcheck confirms <code>crond</code> and the RustFS bucket before reporting healthy.</>,
        ]}
      />

      <DocsH2 id="auth-env">Convex Auth env</DocsH2>
      <DocsP>
        Self-hosted Convex Auth requires deployment env synced before functions
        deploy: <code>SITE_URL</code>, <code>JWT_PRIVATE_KEY</code>, and{' '}
        <code>JWKS</code>. The production deploy profile syncs these before
        pushing functions. Verify the OIDC and JWKS well-known endpoints after
        a change.
      </DocsP>

      <DocsH2 id="security">Security checklist</DocsH2>
      <DocsList
        items={[
          <>The prod admin key is generated on the live backend container, never hand-edited, and stored only in gitignored <code>.env</code> files.</>,
          <><code>POSTGRES_URL</code> stays cluster-only; a {'/<database>'} path makes the backend exit.</>,
          <>No wildcard CORS and no local origin fallbacks.</>,
          <>Telegram origins are explicit env only.</>,
          <>Never commit <code>.env</code>, <code>.env.dev</code>, or generated secrets.</>,
        ]}
      />
    </>
  );
}
