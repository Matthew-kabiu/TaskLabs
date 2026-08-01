export const MCP_PROTOCOL_VERSION = '2025-06-18';

export type JsonRpcId = string | number | null;
export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

const TOKEN_QUERY_PARAMS = ['access_token', 'token', 'api_key', 'key'];

const textSchema = { type: 'string' } as const;
const idSchema = { type: 'string' } as const;
const optionalWorkspaceId = { workspaceId: idSchema };

function objectSchema(
  properties: Record<string, unknown>,
  required: string[] = [],
) {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

export const MCP_TOOLS = [
  {
    name: 'tasks.list',
    description: 'List visible tasks in the API key workspace.',
    inputSchema: objectSchema({
      ...optionalWorkspaceId,
      status: textSchema,
      priority: textSchema,
      q: textSchema,
      sort: textSchema,
      dueFrom: { oneOf: [textSchema, { type: 'number' }] },
      dueTo: { oneOf: [textSchema, { type: 'number' }] },
    }),
  },
  {
    name: 'tasks.get',
    description: 'Get one visible task by id.',
    inputSchema: objectSchema({ ...optionalWorkspaceId, taskId: idSchema }, [
      'taskId',
    ]),
  },
  {
    name: 'tasks.create',
    description: 'Create a task in the API key workspace.',
    inputSchema: objectSchema(
      {
        title: textSchema,
        description: textSchema,
        status: textSchema,
        priority: textSchema,
        dueDate: { oneOf: [textSchema, { type: 'number' }] },
        isPrivate: { type: 'boolean' },
        assigneeIds: { type: 'array', items: idSchema },
        labelIds: { type: 'array', items: idSchema },
      },
      ['title'],
    ),
  },
  {
    name: 'tasks.update',
    description: 'Update a task in the API key workspace.',
    inputSchema: objectSchema(
      {
        taskId: idSchema,
        title: textSchema,
        description: { oneOf: [textSchema, { type: 'null' }] },
        status: textSchema,
        priority: textSchema,
        dueDate: { oneOf: [textSchema, { type: 'number' }, { type: 'null' }] },
        completedAt: {
          oneOf: [textSchema, { type: 'number' }, { type: 'null' }],
        },
        isPrivate: { type: 'boolean' },
        position: { type: 'number' },
        assigneeIds: { type: 'array', items: idSchema },
        labelIds: { type: 'array', items: idSchema },
      },
      ['taskId'],
    ),
  },
  {
    name: 'tasks.delete',
    description: 'Delete a task in the API key workspace.',
    inputSchema: objectSchema({ taskId: idSchema }, ['taskId']),
  },
  {
    name: 'tasks.deleteMany',
    description:
      'Delete multiple tasks atomically. Validates the full batch before deleting any task and caps at 100 tasks.',
    inputSchema: objectSchema(
      {
        taskIds: {
          type: 'array',
          items: idSchema,
          minItems: 1,
          maxItems: 100,
        },
      },
      ['taskIds'],
    ),
  },
  {
    name: 'tasks.reorder',
    description: 'Update task positions in the API key workspace.',
    inputSchema: objectSchema(
      {
        items: {
          type: 'array',
          items: objectSchema({ id: idSchema, position: { type: 'number' } }, [
            'id',
            'position',
          ]),
        },
      },
      ['items'],
    ),
  },
  {
    name: 'events.list',
    description: 'List visible calendar events in a date range.',
    inputSchema: objectSchema({ from: textSchema, to: textSchema }, [
      'from',
      'to',
    ]),
  },
  {
    name: 'events.get',
    description: 'Get one visible calendar event by id.',
    inputSchema: objectSchema({ eventId: idSchema }, ['eventId']),
  },
  {
    name: 'events.create',
    description: 'Create a calendar event.',
    inputSchema: objectSchema(
      {
        title: textSchema,
        description: { oneOf: [textSchema, { type: 'null' }] },
        startAt: textSchema,
        endAt: textSchema,
        allDay: { type: 'boolean' },
        color: { oneOf: [textSchema, { type: 'null' }] },
        location: { oneOf: [textSchema, { type: 'null' }] },
        isPrivate: { type: 'boolean' },
        rrule: { oneOf: [textSchema, { type: 'null' }] },
      },
      ['title', 'startAt', 'endAt'],
    ),
  },
  {
    name: 'events.update',
    description: 'Update a calendar event.',
    inputSchema: objectSchema(
      {
        eventId: idSchema,
        title: textSchema,
        description: { oneOf: [textSchema, { type: 'null' }] },
        startAt: { oneOf: [textSchema, { type: 'number' }] },
        endAt: { oneOf: [textSchema, { type: 'number' }] },
        allDay: { type: 'boolean' },
        color: { oneOf: [textSchema, { type: 'null' }] },
        location: { oneOf: [textSchema, { type: 'null' }] },
        isPrivate: { type: 'boolean' },
        rrule: { oneOf: [textSchema, { type: 'null' }] },
        status: textSchema,
        completedAt: {
          oneOf: [textSchema, { type: 'number' }, { type: 'null' }],
        },
      },
      ['eventId'],
    ),
  },
  {
    name: 'events.delete',
    description: 'Delete a calendar event.',
    inputSchema: objectSchema({ eventId: idSchema }, ['eventId']),
  },
  {
    name: 'events.complete',
    description: 'Mark a calendar event complete or scheduled.',
    inputSchema: objectSchema(
      { eventId: idSchema, completed: { type: 'boolean' } },
      ['eventId'],
    ),
  },
  {
    name: 'labels.list',
    description: 'List workspace labels.',
    inputSchema: objectSchema(optionalWorkspaceId),
  },
  {
    name: 'labels.create',
    description: 'Create a workspace label.',
    inputSchema: objectSchema({ name: textSchema, color: textSchema }, [
      'name',
      'color',
    ]),
  },
  {
    name: 'labels.update',
    description: 'Update a workspace label.',
    inputSchema: objectSchema(
      { labelId: idSchema, name: textSchema, color: textSchema },
      ['labelId'],
    ),
  },
  {
    name: 'labels.delete',
    description: 'Delete a workspace label.',
    inputSchema: objectSchema({ labelId: idSchema }, ['labelId']),
  },
  {
    name: 'workspaces.list',
    description: 'List the workspace available to this API key.',
    inputSchema: objectSchema({}),
  },
  {
    name: 'workspaces.get',
    description: 'Get the workspace available to this API key.',
    inputSchema: objectSchema({}),
  },
  {
    name: 'workspaces.members.list',
    description: 'List members in the API key workspace.',
    inputSchema: objectSchema({}),
  },
  {
    name: 'workspaces.members.update',
    description: 'Update a member role. Requires owner role and members:admin.',
    inputSchema: objectSchema(
      { userId: idSchema, role: { enum: ['OWNER', 'ADMIN', 'MEMBER'] } },
      ['userId', 'role'],
    ),
  },
  {
    name: 'workspaces.members.remove',
    description: 'Remove a member from the API key workspace.',
    inputSchema: objectSchema({ userId: idSchema }, ['userId']),
  },
  {
    name: 'notifications.list',
    description: 'List notifications for the API key owner.',
    inputSchema: objectSchema({ limit: { type: 'number' } }),
  },
  {
    name: 'notifications.markRead',
    description: 'Mark one notification read.',
    inputSchema: objectSchema({ notificationId: idSchema }, ['notificationId']),
  },
  {
    name: 'notifications.markAllRead',
    description: 'Mark all notifications read for the API key owner.',
    inputSchema: objectSchema({}),
  },
  {
    name: 'search.query',
    description: 'Search visible tasks, events, and labels.',
    inputSchema: objectSchema({ q: textSchema, limit: { type: 'number' } }, [
      'q',
    ]),
  },
  {
    name: 'profile.get',
    description: 'Get non-credential profile fields for the API key owner.',
    inputSchema: objectSchema({}),
  },
  {
    name: 'profile.update',
    description: 'Update non-credential profile fields for the API key owner.',
    inputSchema: objectSchema({
      name: textSchema,
      themePreference: { enum: ['LIGHT', 'DARK', 'SYSTEM'] },
    }),
  },
  {
    name: 'telegram.status',
    description: 'Read Telegram connection status for the API key owner.',
    inputSchema: objectSchema({}),
  },
  {
    name: 'telegram.test',
    description: 'Send a Telegram test message for the API key owner.',
    inputSchema: objectSchema({}),
  },
] as const;

export function bearerUnauthorized() {
  return {
    status: 401,
    body: { error: 'Unauthorized' },
    headers: { 'WWW-Authenticate': 'Bearer realm="tasklabs-mcp"' },
  };
}

export function extractBearerToken(headers: Headers) {
  const authorization = headers.get('authorization');
  if (authorization === null) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (match === null || match[1].trim().length < 1) return null;
  return match[1].trim();
}

export function rejectQueryTokens(url: URL) {
  for (const param of TOKEN_QUERY_PARAMS) {
    if (url.searchParams.has(param)) {
      return {
        status: 400,
        body: { error: 'Bearer tokens must be sent in the Authorization header' },
      };
    }
  }
  return null;
}

function normalizeOrigin(value: string) {
  const url = new URL(value.trim());
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function parseAllowedOrigins(value: string) {
  const origins = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map(normalizeOrigin);

  if (origins.length < 1) {
    throw new Error('CORS_ALLOWED_ORIGINS requires at least one origin');
  }

  return [...new Set(origins)];
}

export function resolveCorsAllowOrigin(
  origin: string | null,
  allowedOrigins: readonly string[],
) {
  if (allowedOrigins.length < 1) return null;
  if (origin === null) return allowedOrigins[0];

  let parsedOrigin: string;
  try {
    parsedOrigin = normalizeOrigin(origin);
  } catch {
    return null;
  }

  return allowedOrigins.find((allowed) => allowed === parsedOrigin) ?? null;
}

export function validateMcpHostAndOrigin(input: {
  requestUrl: string;
  headers: Headers;
  allowedOrigins: readonly string[];
}) {
  const expected = input.allowedOrigins.map((origin) => new URL(origin));
  const requestUrl = new URL(input.requestUrl);
  const forwardedHost = input.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedHosts = [
    input.headers.get('host'),
    forwardedHost && forwardedHost.length > 0 ? forwardedHost : null,
  ].filter((host): host is string => host !== null);
  const hostCandidates =
    forwardedHosts.length > 0 ? forwardedHosts : [requestUrl.host];

  if (!hostCandidates.some((host) => expected.some((item) => item.host === host))) {
    return { status: 403, body: { error: 'Invalid MCP host' } };
  }

  const origin = input.headers.get('origin');
  if (origin !== null) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      return { status: 403, body: { error: 'Invalid MCP origin' } };
    }
    if (!expected.some((item) => item.origin === parsed.origin)) {
      return { status: 403, body: { error: 'Invalid MCP origin' } };
    }
  }

  return null;
}

export function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

export function jsonRpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<JsonRpcRequest>;
  return candidate.jsonrpc === '2.0' && typeof candidate.method === 'string';
}
