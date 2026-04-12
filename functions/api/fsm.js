// POST /api/fsm/upload — upload FSM section PDF to R2
// GET /api/fsm/search?q=xxx&vehicle_id=xxx — search FSM content via AI

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max per FSM section
const ALLOWED_TYPES = ['application/pdf', 'application/octet-stream'];

function sanitizeFilename(name) {
  return name.replace(/[\/\\:*?"<>|]/g, '_').replace(/\.\./g, '_');
}

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

    // Validate file is actually a File/Blob
    if (typeof file === 'string' || !file.stream) {
      return Response.json({ error: 'file must be a File upload, not a string' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
      }, { status: 400 });
    }

    // Validate file type
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ error: `Invalid file type: ${file.type}. Only PDF files allowed.` }, { status: 400 });
    }

    // Sanitize filename for R2 key
    const safeName = sanitizeFilename(file.name || 'unnamed.pdf');
    const r2Key = `fsm/${vehicleId}/${Date.now()}-${safeName}`;
    await env.STORAGE.put(r2Key, file.stream(), {
      httpMetadata: { contentType: 'application/pdf' },
      customMetadata: { vehicleId, title, originalName: safeName },
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
