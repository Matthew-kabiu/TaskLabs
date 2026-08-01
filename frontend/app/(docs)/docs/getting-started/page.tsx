import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site';
import { CodeBlock } from '@/components/marketing/code-block';
import {
  DocsCallout,
  DocsH1,
  DocsH2,
  DocsLead,
  DocsList,
  DocsP,
} from '@/components/docs/primitives';

export const metadata: Metadata = {
  title: 'Quickstart — TaskLabs docs',
  description:
    'Install and run TaskLabs with Docker Compose, generate your keys, and complete first-run setup.',
  alternates: { canonical: absoluteUrl('/docs/getting-started') },
};

export default function DocsGettingStartedPage() {
  return (
    <>
      <DocsH1>Quickstart</DocsH1>
      <DocsLead>
        Get a running TaskLabs instance in a few minutes with Docker Compose.
      </DocsLead>

      <DocsH2 id="prerequisites">Prerequisites</DocsH2>
      <DocsList
        items={[
          <><strong>Docker</strong> 24 or newer, with Compose v2.</>,
          <><strong>Node.js</strong> 20 or newer.</>,
          <><strong>pnpm</strong> for workspace installs and tooling.</>,
          <>The <strong>frontend/</strong> and <strong>backend/</strong> packages installed with <code>pnpm install</code> at the repo root.</>,
        ]}
      />

      <DocsH2 id="quickstart">Quickstart</DocsH2>
      <DocsP>
        Copy the example environment file to <code>.env.dev</code> and fill in
        the documented values.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={'cp .env.example .env.dev'}
      />
      <DocsP>Start the database, backend, and admin dashboard.</DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'docker compose --env-file .env.dev -f docker-compose.dev.yml \\',
          '  up -d postgres backend dashboard',
        ].join('\n')}
      />
      <DocsP>
        Generate the security keys the backend needs. This is a one-time step.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'docker compose --env-file .env.dev -f docker-compose.dev.yml \\',
          '  exec backend ./generate_admin_key.sh',
          '',
          'pnpm --dir backend keys',
        ].join('\n')}
      />
      <DocsP>
        Paste the generated values into <code>.env.dev</code> as each command
        instructs, then start the app with the frontend and the Convex watcher.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'docker compose --env-file .env.dev -f docker-compose.dev.yml \\',
          '  up --build frontend convex-dev',
        ].join('\n')}
      />
      <DocsP>
        Open the address you set as <code>FRONTEND_ORIGIN</code> in your{' '}
        <code>.env.dev</code> and continue to first-run setup.
      </DocsP>

      <DocsH2 id="first-run">First-run setup</DocsH2>
      <DocsP>
        The first visit shows a setup wizard. It claims the platform admin
        account with the credentials you choose, then sends you to the app. If
        public registration is enabled, other members can register from the
        login screen; otherwise they join through workspace invitations.
      </DocsP>
      <DocsCallout
        tone="warning"
        title="Telegram chat linking"
      >
        Telegram notifications need a real public HTTPS origin. Leave{' '}
        <code>TELEGRAM_WEBHOOK_ORIGIN</code> empty until you have one — TaskLabs
        will not invent a fallback origin.
      </DocsCallout>

      <DocsH2 id="daily-use">Starting it daily</DocsH2>
      <DocsP>
        After the one-time key setup, starting the stack is a single command.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'docker compose --env-file .env.dev -f docker-compose.dev.yml up -d',
        ].join('\n')}
      />
      <DocsP>
        The dev stack uses the isolated project name <code>tasklabs-dev</code>,
        so it never reuses production volumes or state.
      </DocsP>

      <DocsH2 id="production">Production instance</DocsH2>
      <DocsLead>
        The same Compose model powers a production instance. It runs the
        production image of the frontend, a one-shot Convex deploy step, and the
        backup scheduler — no watchers, no bind mounts.
      </DocsLead>

      <DocsP>
        Create the production environment file from the example and fill in the
        documented values: public origins (<code>FRONTEND_ORIGIN</code>,{' '}
        <code>CONVEX_CLOUD_ORIGIN</code>, <code>CONVEX_SITE_ORIGIN</code>,{' '}
        <code>CORS_ALLOWED_ORIGINS</code>), Postgres, and the RustFS + backup
        Telegram credentials.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'cp .env.example .env',
          '# edit .env — every required key is documented in the template',
        ].join('\n')}
      />
      <DocsP>
        Start the database, backend, and admin dashboard first.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'docker compose --env-file .env -f docker-compose.yml \\',
          '  up -d postgres backend dashboard',
        ].join('\n')}
      />
      <DocsP>
        Generate the one-time security keys exactly as in the dev flow: the
        backend admin key on the live container, and the Convex Auth signing
        keys with <code>pnpm --dir backend keys</code>.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'docker compose --env-file .env -f docker-compose.yml \\',
          '  exec backend ./generate_admin_key.sh',
          '',
          'pnpm --dir backend keys',
        ].join('\n')}
      />
      <DocsP>
        Paste <code>CONVEX_SELF_HOSTED_ADMIN_KEY</code>,{' '}
        <code>JWT_PRIVATE_KEY</code>, and <code>JWKS</code> into <code>.env</code>,
        then bring up the whole stack. The build compiles the production
        frontend image; <code>convex-deploy</code> runs once to sync the Convex
        Auth env and push functions before the frontend starts;{' '}
        <code>db-backup</code> joins the stack.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'docker compose --env-file .env -f docker-compose.yml up --build -d',
        ].join('\n')}
      />
      <DocsP>
        Check the health of all services, then open{' '}
        <code>FRONTEND_ORIGIN</code> to complete first-run setup.
      </DocsP>
      <CodeBlock
        lang="bash"
        code={[
          'docker compose --env-file .env -f docker-compose.yml ps',
        ].join('\n')}
      />
      <DocsCallout tone="info" title="Behind a proxy">
        Production is designed to sit behind Dokploy + Cloudflare Tunnel. Public
        subdomains map to the frontend, Convex API, and site proxy ports; the
        dashboard stays internal and is reached over an SSH tunnel. See the
        Production docs for the full checklist.
      </DocsCallout>
      <DocsCallout
        tone="warning"
        title="Never hand-edit the prod admin key"
      >
        The admin key is generated on the live backend container and stored only
        in gitignored <code>.env</code> files. It is the single credential that
        deploys functions to your instance.
      </DocsCallout>
    </>
  );
}
