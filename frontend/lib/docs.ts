export type DocNavItem = {
  slug: string;
  title: string;
  description: string;
};

export const DOC_NAV: DocNavItem[] = [
  {
    slug: '/docs',
    title: 'Overview',
    description: 'What TaskLabs is, what it does, and how the stack is put together.',
  },
  {
    slug: '/docs/getting-started',
    title: 'Quickstart',
    description: 'Install and run TaskLabs with Docker, then complete first-run setup.',
  },
  {
    slug: '/docs/configuration',
    title: 'Configuration',
    description: 'Environment variables, origins, CORS, and required runtime config.',
  },
  {
    slug: '/docs/usage',
    title: 'Using TaskLabs',
    description: 'Tasks, calendar, workspaces, notifications, search, and Telegram.',
  },
  {
    slug: '/docs/mcp',
    title: 'MCP & API keys',
    description: 'Automate TaskLabs with workspace-scoped API keys and the MCP endpoint.',
  },
  {
    slug: '/docs/deployment',
    title: 'Production',
    description: 'Deploy behind a proxy, run daily backups, and keep secrets out of the repo.',
  },
];

export type DocTocItem = {
  id: string;
  label: string;
};

export const DOC_TOC: Record<string, DocTocItem[]> = {
  '/docs': [
    { id: 'what-is-tasklabs', label: 'What is TaskLabs?' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'features', label: 'What it does' },
    { id: 'next-steps', label: 'Next steps' },
  ],
  '/docs/getting-started': [
    { id: 'prerequisites', label: 'Prerequisites' },
    { id: 'quickstart', label: 'Quickstart' },
    { id: 'first-run', label: 'First-run setup' },
    { id: 'daily-use', label: 'Starting it daily' },
  ],
  '/docs/configuration': [
    { id: 'env-files', label: 'Environment files' },
    { id: 'required-vars', label: 'Required variables' },
    { id: 'origins', label: 'Origins & CORS' },
    { id: 'rules', label: 'Rules to keep' },
  ],
  '/docs/usage': [
    { id: 'tasks', label: 'Tasks' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'workspaces', label: 'Workspaces' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'search', label: 'Search' },
    { id: 'telegram', label: 'Telegram' },
  ],
  '/docs/mcp': [
    { id: 'overview', label: 'Overview' },
    { id: 'create-key', label: 'Create an API key' },
    { id: 'scopes', label: 'Scopes' },
    { id: 'endpoint', label: 'The MCP endpoint' },
    { id: 'example', label: 'Example request' },
    { id: 'tools', label: 'Available tools' },
    { id: 'clients', label: 'Configuring MCP clients' },
    { id: 'security', label: 'Security notes' },
  ],
  '/docs/deployment': [
    { id: 'stack', label: 'The production stack' },
    { id: 'origins', label: 'Origins & CORS' },
    { id: 'backups', label: 'Daily backups' },
    { id: 'auth-env', label: 'Convex Auth env' },
    { id: 'security', label: 'Security checklist' },
  ],
};

export function docIndex(slug: string): number {
  return DOC_NAV.findIndex((item) => item.slug === slug);
}

export function docNeighbors(slug: string): {
  prev: DocNavItem | null;
  next: DocNavItem | null;
} {
  const index = docIndex(slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? DOC_NAV[index - 1] : null,
    next: index < DOC_NAV.length - 1 ? DOC_NAV[index + 1] : null,
  };
}
