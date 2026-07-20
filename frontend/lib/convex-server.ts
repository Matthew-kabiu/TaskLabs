import 'server-only';

export function convexServerOptions(token?: string) {
  const url = process.env.CONVEX_SERVER_URL;
  if (!url) {
    throw new Error('CONVEX_SERVER_URL is required');
  }

  return {
    url,
    token,
    skipConvexDeploymentUrlCheck: true,
  };
}
