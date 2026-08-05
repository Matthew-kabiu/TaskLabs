import { describe, expect, it } from 'vitest';
import {
  MCP_TOOLS,
  extractBearerToken,
  parseAllowedOrigins,
  rejectQueryTokens,
  resolveCorsAllowOrigin,
  validateMcpHostAndOrigin,
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
        'projects.updates.list',
        'projects.updates.create',
        'projects.updates.delete',
        'events.list',
        'labels.list',
        'workspaces.members.list',
        'notifications.markAllRead',
        'search.query',
        'profile.get',
        'telegram.status',
      ]),
    );
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
