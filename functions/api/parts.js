// GET   /api/parts?project_id=xxx — list parts for a project
// POST  /api/parts — add a part
// PATCH /api/parts — update a part (status, notes)

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id');

  if (!projectId) {
    return Response.json({ error: 'project_id required' }, { status: 400 });
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM parts WHERE project_id = ? ORDER BY id'
    ).bind(projectId).all();
    return Response.json({ parts: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    if (!body.project_id || !body.name) {
      return Response.json({ error: 'project_id and name required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      'INSERT INTO parts (project_id, name, part_number, status, cost, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.project_id, body.name, body.part_number || null,
      body.status || 'need', body.cost || null,
      body.source || null, body.notes || null
    ).run();

    return Response.json({ id: result.meta.last_row_id, success: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPatch(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    if (body.id == null) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }

    const updates = [];
    const binds = [];

    for (const field of ['name', 'part_number', 'status', 'cost', 'source', 'notes']) {
      if (body[field] != null) {
        updates.push(`${field} = ?`);
        binds.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    binds.push(body.id);
    await env.DB.prepare(
      `UPDATE parts SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...binds).run();

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
