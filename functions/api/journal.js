// GET  /api/journal?project_id=xxx — get journal entries
// POST /api/journal — add a journal entry

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id');

  if (!projectId) {
    return Response.json({ error: 'project_id required' }, { status: 400 });
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM project_journal WHERE project_id = ? ORDER BY created_at DESC'
    ).bind(projectId).all();
    return Response.json({ entries: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    if (!body.project_id || !body.entry) {
      return Response.json({ error: 'project_id and entry required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      'INSERT INTO project_journal (project_id, entry) VALUES (?, ?)'
    ).bind(body.project_id, body.entry).run();

    return Response.json({ id: result.meta.last_row_id, success: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
