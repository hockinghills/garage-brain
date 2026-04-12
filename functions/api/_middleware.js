// Auth middleware — protects all /api/* endpoints
// Same-origin requests (the frontend) are allowed through.
// External API calls require Bearer token or X-API-Key header.
//
// Set the secret via: wrangler secret put API_SECRET

export async function onRequest(context) {
  const { env, request, next } = context;

  // GETs are always public
  if (request.method === 'GET') {
    return next();
  }

  // Allow same-origin requests from the frontend.
  // Browsers send Origin on same-site POSTs — if it matches our host, let it through.
  const origin = request.headers.get('Origin');
  const requestUrl = new URL(request.url);
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === requestUrl.host) {
        return next();
      }
    } catch {
      // Malformed origin — fall through to API key check
    }
  }

  // External requests require API key
  const secret = env.API_SECRET;
  if (!secret) {
    if (env.ENVIRONMENT === 'development') {
      return next();
    }
    return Response.json(
      { error: 'API_SECRET not configured. Set via: wrangler secret put API_SECRET' },
      { status: 500 }
    );
  }

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
