import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site';
import { CodeBlock } from '@/components/marketing/code-block';
import {
  DocsCallout,
  DocsH1,
  DocsH2,
  DocsInlineCode,
  DocsLead,
  DocsList,
  DocsP,
  DocsTable,
} from '@/components/docs/primitives';

export const metadata: Metadata = {
  title: 'MCP & API keys — TaskLabs docs',
  description:
    'Automate TaskLabs with workspace-scoped API keys and the stateless MCP endpoint at POST /api/mcp.',
  alternates: { canonical: absoluteUrl('/docs/mcp') },
};

const SCOPE_ROWS: [string, string][] = [
  ['tasks:read / tasks:write', 'Task list/get and mutation MCP tools'],
  ['events:read / events:write', 'Calendar event list/get and mutation tools'],
  ['labels:read / labels:write', 'Workspace label MCP tools'],
  ['workspaces:read / workspaces:admin', 'Workspace metadata; admin scope reserved'],
  ['members:read / members:admin', 'Workspace members list/update/remove'],
  ['notifications:read / notifications:write', 'Notification list and mark-read tools'],
  ['search:read', 'Workspace search'],
  ['profile:read / profile:write', 'Non-credential profile fields'],
  ['telegram:read / telegram:test', 'Telegram status and test send'],
  ['system:read / system:write', 'Reserved for platform-admin system tools'],
];

export default function DocsMcpPage() {
  return (
    <>
      <DocsH1>MCP &amp; API keys</DocsH1>
      <DocsLead>
        Automate TaskLabs with workspace-scoped API keys and the stateless MCP
        endpoint at <code>POST /api/mcp</code>.
      </DocsLead>

      <DocsH2 id="overview">Overview</DocsH2>
      <DocsP>
        API keys give scripts and AI agents access to a single workspace without
        a browser session. Keys are scope-limited, revocable, rotatable,
        expiry-aware, and stored hashed — only the prefix and a SHA-256 hash
        are persisted. The raw token is shown once, at creation or rotation
        time.
      </DocsP>
      <DocsP>
        The endpoint speaks JSON-RPC over stateless HTTP. v1 exposes tools
        only: no prompts, resources, sampling, SSE, resumability, or MCP
        session IDs.
      </DocsP>

      <DocsH2 id="create-key">Create an API key</DocsH2>
      <DocsList
        items={[
          <>Open <strong>Settings → Profile → API keys</strong>.</>,
          <>Choose the scopes the key should have.</>,
          <>Set an optional expiry date (or choose Never).</>,
          <>Copy the token immediately — it is shown once.</>,
        ]}
      />
      <DocsP>
        Rotate a key to mint a replacement and invalidate the old secret, or
        revoke it entirely. Revocation takes effect immediately.
      </DocsP>

      <DocsH2 id="scopes">Scopes</DocsH2>
      <DocsTable head={['Scope', 'Access']} rows={SCOPE_ROWS} />
      <DocsP>
        Admin scopes require the current user to hold the matching live role in
        the workspace. Platform system scopes require{' '}
        <DocsInlineCode>platformRole: ADMIN</DocsInlineCode>.
      </DocsP>

      <DocsH2 id="endpoint">The MCP endpoint</DocsH2>
      <CodeBlock
        lang="text"
        code={[
          'POST /api/mcp',
          'Authorization: Bearer <TaskLabs API key>',
          'Content-Type: application/json',
          'Accept: application/json',
          'MCP-Protocol-Version: 2025-06-18',
        ].join('\n')}
      />
      <DocsList
        items={[
          <>Every request requires a bearer API key. Query-string tokens are rejected.</>,
          <><DocsInlineCode>GET</DocsInlineCode> and <DocsInlineCode>DELETE</DocsInlineCode> return 405.</>,
          <>The request Host (or first proxy-forwarded host) must match an allowed origin.</>,
          <>Browser Origin, when present, must match an allowed origin.</>,
          <>Tool errors return MCP results with <DocsInlineCode>isError: true</DocsInlineCode>; stack traces are never returned.</>,
        ]}
      />

      <DocsH2 id="example">Example request</DocsH2>
      <CodeBlock
        lang="bash"
        code={[
          'curl -sS https://your.domain/api/mcp \\',
          "  -H 'Authorization: Bearer tlk_live_exampleprefix_exampleSecretValueDoNotUse' \\",
          "  -H 'Content-Type: application/json' \\",
          "  -H 'Accept: application/json' \\",
          "  -H 'MCP-Protocol-Version: 2025-06-18' \\",
          "  --data '{\"jsonrpc\":\"2.0\",\"id\":1,",
          "    \"method\":\"tools/list\",\"params\":{}}'",
        ].join('\n')}
      />
      <DocsCallout tone="warning" title="Use example tokens in docs only">
        Never paste generated local or production tokens into tracked files,
        logs, test snapshots, or handoff notes.
      </DocsCallout>

      <DocsH2 id="tools">Available tools</DocsH2>
      <DocsList
        items={[
          <><strong>tasks</strong> — list, get, create, update, delete, deleteMany, reorder</>,
          <><strong>events</strong> — list, get, create, update, delete, complete</>,
          <><strong>labels</strong> — list, create, update, delete</>,
          <><strong>workspaces</strong> — list, get, members list/update/remove</>,
          <><strong>notifications</strong> — list, markRead, markAllRead</>,
          <><strong>search</strong> — query</>,
          <><strong>profile</strong> — get, update</>,
          <><strong>telegram</strong> — status, test</>,
        ]}
      />
      <DocsP>
        Every tool executes against the API key’s workspace. Supplying a
        different <DocsInlineCode>workspaceId</DocsInlineCode> is rejected.
      </DocsP>
      <DocsP>
        <DocsInlineCode>tasks.deleteMany</DocsInlineCode> removes a batch of
        tasks atomically — it validates membership and private-task ownership
        for the full selection before deleting anything, deduplicates IDs, and
        rejects batches over 100 tasks.
      </DocsP>

      <DocsH2 id="clients">Configuring MCP clients</DocsH2>
      <DocsP>
        Point an MCP client at your frontend origin as the base URL and append{' '}
        <DocsInlineCode>/api/mcp</DocsInlineCode>. Configure the transport as
        stateless HTTP with a bearer token — the API key — and the protocol
        version above. Because the endpoint is stateless, clients reconnect per
        request rather than holding a session.
      </DocsP>

      <DocsH2 id="security">Security notes</DocsH2>
      <DocsList
        items={[
          <>API keys never create browser sessions.</>,
          <>Keys cannot call setup, registration, invitation acceptance, credential changes, or API-key management.</>,
          <><DocsInlineCode>CORS_ALLOWED_ORIGINS</DocsInlineCode> must list exact origins; wildcard CORS is not used.</>,
          <>Tokens are hashed at rest; rotate any key that may have leaked.</>,
        ]}
      />
    </>
  );
}
