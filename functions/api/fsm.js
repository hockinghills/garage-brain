// POST /api/fsm/upload — upload FSM section PDF to R2
// GET /api/fsm/search?q=xxx&vehicle_id=xxx — search FSM content via AI

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const vehicleId = formData.get('vehicle_id');
    const title = formData.get('title');

    if (!file || !vehicleId || !title) {
      return Response.json({ error: 'file, vehicle_id, and title required' }, { status: 400 });
    }

    // Store in R2
    const r2Key = `fsm/${vehicleId}/${Date.now()}-${file.name}`;
    await env.STORAGE.put(r2Key, file.stream(), {
      customMetadata: { vehicleId, title, originalName: file.name },
    });

    // Record in D1
    await env.DB.prepare(
      `INSERT INTO fsm_sections (vehicle_id, title, r2_key) VALUES (?, ?, ?)`
    ).bind(vehicleId, title, r2Key).run();

    // TODO: Trigger AI indexing via Workers AI / AI Search
    // - Extract text from PDF
    // - Generate embeddings
    // - Store in vectorize index
    // - Extract tool requirements from content

    return Response.json({ success: true, r2Key });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const vehicleId = url.searchParams.get('vehicle_id');

  if (!query) {
    return Response.json({ error: 'q parameter required' }, { status: 400 });
  }

  try {
    // TODO: Use Workers AI / AI Search to query indexed FSM content
    // For now, return a placeholder
    return Response.json({
      results: [],
      message: 'AI Search not yet configured — upload FSM sections and enable AI Search in wrangler.toml',
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
