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
  return new ConvexHttpClient(requireEnv('CONVEX_SERVER_URL'), {
    skipConvexDeploymentUrlCheck: true,
  });
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
    'Access-Control-Expose-Headers':
      'WWW-Authenticate, MCP-Protocol-Version, Retry-After',
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

function authenticateTransport(request: Request) {
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

class McpUnauthorizedError extends Error {}

class McpRateLimitedError extends Error {
  constructor(readonly retryAfterMs: number) {
    super('Rate limit exceeded');
  }
}

/**
 * Ice RAG over MCP: embed the question locally in this route and inject the
 * vector. Convex actions cannot load native ONNX modules, so the vector
 * must be computed here; the dispatch layer re-validates model identity.
 */
async function withRagVector(toolArgs: unknown): Promise<unknown> {
  const args =
    toolArgs && typeof toolArgs === 'object' && !Array.isArray(toolArgs)
      ? (toolArgs as Record<string, unknown>)
      : {};
  if (Array.isArray(args.queryVector)) return args;
  const question = typeof args.q === 'string' ? args.q.trim() : '';
  if (question.length < 1 || question.length > 2000) {
    throw new Error('q is required (1-2000 characters)');
  }
  const { embedTexts } = await import('@/lib/rag/embed');
  const [vector] = await embedTexts([question]);
  return { ...args, queryVector: vector };
}

function throwStructuredBackendError(error: unknown): never {
  const candidate = error as { data?: unknown };
  const data =
    candidate?.data !== null && typeof candidate?.data === 'object'
      ? (candidate.data as Record<string, unknown>)
      : null;
  if (data?.kind === 'ApiKeyUnauthorized') {
    throw new McpUnauthorizedError();
  }
  if (
    data?.kind === 'RateLimited' &&
    typeof data.retryAfter === 'number' &&
    Number.isFinite(data.retryAfter)
  ) {
    throw new McpRateLimitedError(Math.max(1, data.retryAfter));
  }
  throw error;
}

type RpcOutcome = {
  payload: ReturnType<typeof jsonRpcResult> | ReturnType<typeof jsonRpcError> | null;
  retryAfterMs?: number;
};

async function handleRpc(
  request: JsonRpcRequest,
  token: string,
  verifyControlRequest: () => Promise<void>,
): Promise<RpcOutcome> {
  const id = request.id ?? null;

  if (request.method !== 'tools/call') {
    try {
      await verifyControlRequest();
    } catch (error) {
      if (error instanceof McpRateLimitedError) {
        return {
          payload: jsonRpcError(id, -32029, 'Rate limit exceeded', {
            retryAfterMs: error.retryAfterMs,
          }),
          retryAfterMs: error.retryAfterMs,
        };
      }
      throw error;
    }
  }

  if (request.method === 'initialize') {
    return {
      payload: jsonRpcResult(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'tasklabs', version: '0.1.0' },
      }),
    };
  }

  if (request.method === 'notifications/initialized') {
    return { payload: null };
  }

  if (request.method === 'tools/list') {
    return { payload: jsonRpcResult(id, { tools: MCP_TOOLS }) };
  }

  if (request.method === 'tools/call') {
    const params =
      request.params && typeof request.params === 'object'
        ? (request.params as { name?: unknown; arguments?: unknown })
        : {};
    if (typeof params.name !== 'string') {
      try {
        await verifyControlRequest();
      } catch (error) {
        if (error instanceof McpRateLimitedError) {
          return {
            payload: jsonRpcError(id, -32029, 'Rate limit exceeded', {
              retryAfterMs: error.retryAfterMs,
            }),
            retryAfterMs: error.retryAfterMs,
          };
        }
        throw error;
      }
      return { payload: jsonRpcError(id, -32602, 'Tool name is required') };
    }

    try {
      const toolInput =
        params.name === 'rag.query' || params.name === 'rag.ask'
          ? await withRagVector(params.arguments ?? {})
          : (params.arguments ?? {});
      const result = await client().action(BACKEND_ROUTES.apiKeys.mcpDispatch, {
        token,
        toolName: params.name,
        input: toolInput,
      });
      return { payload: jsonRpcResult(id, responsePayload(result)) };
    } catch (error) {
      try {
        throwStructuredBackendError(error);
      } catch (structuredError) {
        if (structuredError instanceof McpRateLimitedError) {
          return {
            payload: jsonRpcError(id, -32029, 'Rate limit exceeded', {
              retryAfterMs: structuredError.retryAfterMs,
            }),
            retryAfterMs: structuredError.retryAfterMs,
          };
        }
        if (structuredError instanceof McpUnauthorizedError) throw structuredError;
        return { payload: jsonRpcResult(id, errorPayload(structuredError)) };
      }
    }
  }

  return { payload: jsonRpcError(id, -32601, 'Method not found') };
}

export async function POST(request: Request) {
  const auth = authenticateTransport(request);
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
  let retryAfterMs = 0;
  let controlVerification: Promise<void> | undefined;
  const verifyControlRequest = () => {
    controlVerification ??= client()
      .mutation(BACKEND_ROUTES.apiKeys.verifyBearer, {
        token: auth.token,
        requiredScopes: [],
      })
      .then(() => undefined)
      .catch((error) => throwStructuredBackendError(error));
    return controlVerification;
  };
  // Batch entries are dispatched sequentially on purpose. JSON-RPC 2.0 permits
  // concurrent processing, but a batch here may carry dependent mutations
  // (create a task, then update it), and every dispatch passes through the
  // fail-closed Convex rate limiter — running them in parallel would make both
  // ordering and rate-limit outcomes nondeterministic. Do not convert this to
  // Promise.all.
  try {
    for (const item of requests) {
      if (!isJsonRpcRequest(item)) {
        await verifyControlRequest();
        results.push(jsonRpcError(null, -32600, 'Invalid Request'));
        continue;
      }
      const result = await handleRpc(item, auth.token, verifyControlRequest);
      retryAfterMs = Math.max(retryAfterMs, result.retryAfterMs ?? 0);
      if (result.payload !== null && 'id' in item) results.push(result.payload);
    }
  } catch (error) {
    if (error instanceof McpUnauthorizedError) {
      const challenge = bearerUnauthorized();
      return json(challenge.body, challenge.status, {
        ...challenge.headers,
        ...corsHeaders(request),
      });
    }
    throw error;
  }

  if (results.length === 0) {
    if (retryAfterMs > 0) {
      return json(jsonRpcError(null, -32029, 'Rate limit exceeded', {
        retryAfterMs,
      }), 429, {
        'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
        ...corsHeaders(request),
      });
    }
    return new Response(null, { status: 202, headers: corsHeaders(request) });
  }

  return json(
    Array.isArray(body) ? results : results[0],
    retryAfterMs > 0 ? 429 : 200,
    {
      ...(retryAfterMs > 0
        ? { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1000))) }
        : {}),
      ...corsHeaders(request),
    },
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
