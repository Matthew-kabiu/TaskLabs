import { ConvexHttpClient } from 'convex/browser';
import { BACKEND_ROUTES } from '@/lib/routes';
import {
  MCP_PROTOCOL_VERSION,
  MCP_TOOLS,
  bearerUnauthorized,
  extractBearerToken,
  isJsonRpcRequest,
  jsonRpcError,
  jsonRpcResult,
  parseAllowedOrigins,
  rejectQueryTokens,
  resolveCorsAllowOrigin,
  validateMcpHostAndOrigin,
  type JsonRpcRequest,
} from '@/lib/mcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (value === undefined || value.trim().length < 1) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function client() {
  return new ConvexHttpClient(requireEnv('NEXT_PUBLIC_CONVEX_URL'));
}

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function allowedOrigins() {
  return parseAllowedOrigins(requireEnv('CORS_ALLOWED_ORIGINS'));
}

function corsHeaders(request: Request) {
  const allowOrigin = resolveCorsAllowOrigin(
    request.headers.get('origin'),
    allowedOrigins(),
  );
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, Accept, MCP-Protocol-Version',
    'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Protocol-Version',
    'Access-Control-Max-Age': '600',
    vary: 'Origin',
  };
  if (allowOrigin !== null) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
  }
  return headers;
}

function methodNotAllowed(request: Request) {
  return json(
    { error: 'Method Not Allowed' },
    405,
    { allow: 'POST, OPTIONS', ...corsHeaders(request) },
  );
}

async function authenticate(request: Request) {
  const url = new URL(request.url);
  const queryTokenError = rejectQueryTokens(url);
  if (queryTokenError !== null) {
    return {
      response: json(
        queryTokenError.body,
        queryTokenError.status,
        corsHeaders(request),
      ),
    };
  }

  const transportError = validateMcpHostAndOrigin({
    requestUrl: request.url,
    headers: request.headers,
    allowedOrigins: allowedOrigins(),
  });
  if (transportError !== null) {
    return {
      response: json(
        transportError.body,
        transportError.status,
        corsHeaders(request),
      ),
    };
  }

  const token = extractBearerToken(request.headers);
  if (token === null) {
    const challenge = bearerUnauthorized();
    return {
      response: json(challenge.body, challenge.status, {
        ...challenge.headers,
        ...corsHeaders(request),
      }),
    };
  }

  try {
    await client().mutation(BACKEND_ROUTES.apiKeys.verifyBearer, {
      token,
      requiredScopes: [],
    });
  } catch {
    const challenge = bearerUnauthorized();
    return {
      response: json(challenge.body, challenge.status, {
        ...challenge.headers,
        ...corsHeaders(request),
      }),
    };
  }

  return { token };
}

function responsePayload(result: unknown) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function errorPayload(error: unknown) {
  const message = error instanceof Error ? error.message : 'Tool call failed';
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

async function handleRpc(request: JsonRpcRequest, token: string) {
  const id = request.id ?? null;

  if (request.method === 'initialize') {
    return jsonRpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'tasklabs', version: '0.1.0' },
    });
  }

  if (request.method === 'notifications/initialized') {
    return null;
  }

  if (request.method === 'tools/list') {
    return jsonRpcResult(id, { tools: MCP_TOOLS });
  }

  if (request.method === 'tools/call') {
    const params =
      request.params && typeof request.params === 'object'
        ? (request.params as { name?: unknown; arguments?: unknown })
        : {};
    if (typeof params.name !== 'string') {
      return jsonRpcError(id, -32602, 'Tool name is required');
    }

    try {
      const result = await client().action(BACKEND_ROUTES.apiKeys.mcpDispatch, {
        token,
        toolName: params.name,
        input: params.arguments ?? {},
      });
      return jsonRpcResult(id, responsePayload(result));
    } catch (error) {
      return jsonRpcResult(id, errorPayload(error));
    }
  }

  return jsonRpcError(id, -32601, 'Method not found');
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      jsonRpcError(null, -32700, 'Parse error'),
      400,
      corsHeaders(request),
    );
  }

  const requests = Array.isArray(body) ? body : [body];
  const results = [];
  for (const item of requests) {
    if (!isJsonRpcRequest(item)) {
      results.push(jsonRpcError(null, -32600, 'Invalid Request'));
      continue;
    }
    const result = await handleRpc(item, auth.token);
    if (result !== null && 'id' in item) results.push(result);
  }

  if (results.length === 0) {
    return new Response(null, { status: 202, headers: corsHeaders(request) });
  }

  return json(
    Array.isArray(body) ? results : results[0],
    200,
    corsHeaders(request),
  );
}

export async function OPTIONS(request: Request) {
  const transportError = validateMcpHostAndOrigin({
    requestUrl: request.url,
    headers: request.headers,
    allowedOrigins: allowedOrigins(),
  });
  if (transportError !== null) {
    return json(
      transportError.body,
      transportError.status,
      corsHeaders(request),
    );
  }

  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  return methodNotAllowed(request);
}

export async function DELETE(request: Request) {
  return methodNotAllowed(request);
}
