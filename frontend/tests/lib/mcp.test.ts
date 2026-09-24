import { describe, expect, it } from 'vitest';
import {
  MCP_TOOLS,
  extractBearerToken,
  parseAllowedOrigins,
  rejectQueryTokens,
  resolveCorsAllowOrigin,
  validateMcpHostAndOrigin,
  jsonRpcError,
} from '@/lib/mcp';

describe('MCP route helpers', () => {
  it('extracts bearer tokens only from Authorization headers', () => {
    expect(
      extractBearerToken(new Headers({ authorization: 'Bearer tlk_live_x_y' })),
    ).toBe('tlk_live_x_y');
    expect(extractBearerToken(new Headers())).toBeNull();
    expect(extractBearerToken(new Headers({ authorization: 'Basic x' }))).toBeNull();
  });

  it('rejects query-string token transport', () => {
    expect(
      rejectQueryTokens(new URL('https://tasklabs.test/api/mcp?token=secret')),
    ).toMatchObject({ status: 400 });
    expect(
      rejectQueryTokens(new URL('https://tasklabs.test/api/mcp')),
    ).toBeNull();
  });

  it('parses and resolves explicit CORS origins', () => {
    const allowedOrigins = parseAllowedOrigins(
      'https://tasklabs.test/, https://api.tasklabs.test',
    );

    expect(allowedOrigins).toEqual([
      'https://tasklabs.test',
      'https://api.tasklabs.test',
    ]);
    expect(resolveCorsAllowOrigin(null, allowedOrigins)).toBe(
      'https://tasklabs.test',
    );
    expect(
      resolveCorsAllowOrigin('https://api.tasklabs.test', allowedOrigins),
    ).toBe('https://api.tasklabs.test');
    expect(resolveCorsAllowOrigin('https://evil.test', allowedOrigins)).toBeNull();
  });

  it('validates host and browser origin against configured public origins', () => {
    const allowedOrigins = [
      'https://tasklabs.test',
      'https://api.tasklabs.test',
    ];
    expect(
      validateMcpHostAndOrigin({
        requestUrl: 'https://tasklabs.test/api/mcp',
        allowedOrigins,
        headers: new Headers({
          host: 'tasklabs.test',
          origin: 'https://tasklabs.test',
        }),
      }),
    ).toBeNull();

    expect(
      validateMcpHostAndOrigin({
        requestUrl: 'https://api.tasklabs.test/api/mcp',
        allowedOrigins,
        headers: new Headers({
          host: 'api.tasklabs.test',
          origin: 'https://api.tasklabs.test',
        }),
      }),
    ).toBeNull();

    expect(
      validateMcpHostAndOrigin({
        requestUrl: 'http://frontend:3000/api/mcp',
        allowedOrigins,
        headers: new Headers({
          host: 'frontend:3000',
          'x-forwarded-host': 'tasklabs.test',
          origin: 'https://tasklabs.test',
        }),
      }),
    ).toBeNull();

    expect(
      validateMcpHostAndOrigin({
        requestUrl: 'https://tasklabs.test/api/mcp',
        allowedOrigins,
        headers: new Headers({
          host: 'evil.test',
          origin: 'https://tasklabs.test',
        }),
      }),
    ).toMatchObject({ status: 403 });

    expect(
      validateMcpHostAndOrigin({
        requestUrl: 'https://tasklabs.test/api/mcp',
        allowedOrigins,
        headers: new Headers({
          host: 'tasklabs.test',
          origin: 'https://evil.test',
        }),
      }),
    ).toMatchObject({ status: 403 });
  });

  it('publishes the expected constrained v1 tool surface', () => {
    expect(MCP_TOOLS.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'tasks.list',
        'tasks.create',
        'tasks.deleteMany',
        'projects.list',
        'projects.create',
        'projects.update',
        'projects.delete',
        'projects.favorite',
        'projects.updates.list',
        'projects.updates.create',
        'projects.updates.delete',
        'events.list',
        'labels.list',
        'workspaces.members.list',
        'notifications.unread',
        'notifications.markAllRead',
        'search.query',
        'rag.query',
        'rag.ask',
        'rag.status',
        'rag.reindex',
        'profile.get',
        'telegram.status',
      ]),
    );
  });

  it('publishes project linkage, lead, and favorite fields', () => {
    const taskCreate = MCP_TOOLS.find((tool) => tool.name === 'tasks.create');
    const projectCreate = MCP_TOOLS.find((tool) => tool.name === 'projects.create');
    const projectUpdate = MCP_TOOLS.find((tool) => tool.name === 'projects.update');
    const projectUpdateCreate = MCP_TOOLS.find(
      (tool) => tool.name === 'projects.updates.create',
    );

    expect(taskCreate?.inputSchema.properties).toMatchObject({
      idempotencyKey: { type: 'string', maxLength: 128 },
      projectId: { type: 'string' },
      position: { type: 'number' },
    });
    expect(taskCreate?.inputSchema.required).toEqual(['idempotencyKey', 'title']);
    expect(projectCreate?.inputSchema.properties).toMatchObject({
      leadId: { type: 'string' },
    });
    expect(projectUpdate?.inputSchema.properties).toMatchObject({
      leadId: { type: 'string' },
    });
    expect(projectUpdateCreate?.inputSchema.properties).toMatchObject({
      body: {
        type: 'string',
        description: expect.stringContaining('Markdown'),
      },
    });
  });

  it('publishes API-parity timestamp and profile preference fields', () => {
    const eventCreate = MCP_TOOLS.find((tool) => tool.name === 'events.create');
    const eventComplete = MCP_TOOLS.find((tool) => tool.name === 'events.complete');
    const profileUpdate = MCP_TOOLS.find((tool) => tool.name === 'profile.update');

    expect(eventCreate?.inputSchema.properties).toMatchObject({
      startAt: { oneOf: expect.arrayContaining([{ type: 'number' }]) },
      endAt: { oneOf: expect.arrayContaining([{ type: 'number' }]) },
    });
    expect(eventComplete?.inputSchema.required).toEqual(['eventId', 'completed']);
    expect(profileUpdate?.inputSchema.properties).toMatchObject({
      notifyLeadMinutesTask: { type: 'array' },
      notifyLeadMinutesEvent: { type: 'array' },
      notifyLeadCustomTask: { type: 'boolean' },
      notifyLeadCustomEvent: { type: 'boolean' },
    });
  });

  it('publishes explicit task statuses and structured JSON-RPC error data', () => {
    const taskCreate = MCP_TOOLS.find((tool) => tool.name === 'tasks.create');
    const taskUpdate = MCP_TOOLS.find((tool) => tool.name === 'tasks.update');

    expect(taskCreate?.inputSchema.properties.status).toMatchObject({
      enum: expect.arrayContaining(['BACKLOG', 'IN_REVIEW', 'DONE']),
      description: expect.stringContaining('blocked label'),
    });
    expect(taskUpdate?.inputSchema.properties.status).toEqual(
      taskCreate?.inputSchema.properties.status,
    );
    expect(jsonRpcError(7, -32029, 'Rate limit exceeded', { retryAfterMs: 500 })).toEqual({
      jsonrpc: '2.0',
      id: 7,
      error: {
        code: -32029,
        message: 'Rate limit exceeded',
        data: { retryAfterMs: 500 },
      },
    });
  });

  it('publishes update fields for event mutation tools', () => {
    const eventUpdate = MCP_TOOLS.find((tool) => tool.name === 'events.update');

    expect(eventUpdate?.inputSchema).toMatchObject({
      properties: expect.objectContaining({
        eventId: { type: 'string' },
        title: { type: 'string' },
        startAt: expect.any(Object),
        endAt: expect.any(Object),
        status: { type: 'string' },
        completedAt: expect.any(Object),
      }),
      required: ['eventId'],
    });
  });
});
