// GET  /api/steps?project_id=xxx — list steps for a project
// POST /api/steps — add a step
// PATCH /api/steps — update a step (toggle done, update text)

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id');

  if (!projectId) {
    return Response.json({ error: 'project_id required' }, { status: 400 });
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM steps WHERE project_id = ? ORDER BY sort_order'
    ).bind(projectId).all();
    return Response.json({ steps: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    if (!body.project_id || !body.text) {
      return Response.json({ error: 'project_id and text required' }, { status: 400 });
    }

    // Auto-assign sort_order if not provided
    let sortOrder = body.sort_order;
    if (sortOrder == null) {
      const { results } = await env.DB.prepare(
        'SELECT MAX(sort_order) as max_order FROM steps WHERE project_id = ?'
      ).bind(body.project_id).all();
      sortOrder = (results[0]?.max_order ?? -1) + 1;
    }

    const result = await env.DB.prepare(
      'INSERT INTO steps (project_id, sort_order, text, done, notes) VALUES (?, ?, ?, 0, ?)'
    ).bind(body.project_id, sortOrder, body.text, body.notes || null).run();

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

    if (body.done != null) {
      updates.push('done = ?');
      binds.push(body.done ? 1 : 0);
      if (body.done) {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      } else {
        updates.push('completed_at = NULL');
      }
    }
    if (body.text != null) {
      updates.push('text = ?');
      binds.push(body.text);
    }
    if (body.notes != null) {
      updates.push('notes = ?');
      binds.push(body.notes);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    binds.push(body.id);
    await env.DB.prepare(
      `UPDATE steps SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...binds).run();

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
