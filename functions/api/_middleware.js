// Auth middleware — protects all /api/* endpoints
// For personal use: simple shared secret via header or cookie
// Upgrade path: Cloudflare Access, OAuth, or JWT
//
// Set the secret via: wrangler secret put API_SECRET

export async function onRequest(context) {
  const { env, request, next } = context;

  // Only protect mutating methods
  if (request.method === 'GET') {
    return next();
  }

  const secret = env.API_SECRET;
  if (!secret) {
    // No secret configured — reject all writes in production
    // In dev, allow everything
    if (env.ENVIRONMENT === 'development') {
      return next();
    }
    return Response.json(
      { error: 'API_SECRET not configured. Set via: wrangler secret put API_SECRET' },
      { status: 500 }
    );
  }

  // Check Authorization header or X-API-Key header
  const authHeader = request.headers.get('Authorization');
  const apiKey = request.headers.get('X-API-Key');
  const token = authHeader?.replace('Bearer ', '') || apiKey;

  if (token !== secret) {
    return Response.json(
      { error: 'Unauthorized. Provide valid Bearer token or X-API-Key header.' },
      { status: 401 }
    );
  }

  return next();
}
