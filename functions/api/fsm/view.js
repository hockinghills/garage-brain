// GET /api/fsm/view?key=fsm/nissan-leaf-sl-2013/2013/BR.pdf
// GET /api/fsm/view?vehicle_id=nissan-leaf-sl-2013&code=BR
//
// Serves the PDF directly from R2 so it opens in the browser's PDF viewer.

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  let r2Key = url.searchParams.get('key');
  const vehicleId = url.searchParams.get('vehicle_id');
  const code = url.searchParams.get('code');

  // If no direct key, look it up by vehicle + section code
  if (!r2Key && vehicleId && code) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT r2_key FROM fsm_sections 
         WHERE vehicle_id = ? AND (title LIKE ? || '%' OR r2_key LIKE '%/' || ? || '.pdf')
         LIMIT 1`
      ).bind(vehicleId, code, code).all();

      if (results.length > 0) {
        r2Key = results[0].r2_key;
      }
    } catch {
      // Fall through to not-found
    }
  }

  if (!r2Key) {
    return Response.json(
      { error: 'Provide key or vehicle_id + code' },
      { status: 400 }
    );
  }

  try {
    const object = await env.STORAGE.get(r2Key);
    if (!object) {
      return Response.json({ error: 'PDF not found in storage' }, { status: 404 });
    }

    // Extract a readable filename from the key
    const filename = r2Key.split('/').pop() || 'section.pdf';

    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
