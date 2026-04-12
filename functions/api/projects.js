// GET /api/projects?vehicle_id=xxx — list projects for a vehicle
// POST /api/projects — create a project
// PATCH /api/projects — update project (status, notes)

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get('vehicle_id');
  try {
    let query = 'SELECT * FROM projects';
    const binds = [];
    if (vehicleId) {
      query += ' WHERE vehicle_id = ?';
      binds.push(vehicleId);
    }
    query += ' ORDER BY updated_at DESC';
    const { results } = await env.DB.prepare(query).bind(...binds).all();

    // Fetch related data for each project in parallel
    for (const project of results) {
      const [steps, parts, tools, fsm] = await Promise.all([
        env.DB.prepare(
          'SELECT * FROM steps WHERE project_id = ? ORDER BY sort_order'
        ).bind(project.id).all(),
        env.DB.prepare(
          'SELECT * FROM parts WHERE project_id = ? ORDER BY id'
        ).bind(project.id).all(),
        env.DB.prepare(
          `SELECT t.*, pt.notes as project_note
           FROM tools t
           JOIN project_tools pt ON t.id = pt.tool_id
           WHERE pt.project_id = ?
           ORDER BY t.name`
        ).bind(project.id).all(),
        env.DB.prepare(
          `SELECT fs.title, fs.r2_key
           FROM fsm_sections fs
           JOIN project_fsm pf ON fs.id = pf.fsm_section_id
           WHERE pf.project_id = ?`
        ).bind(project.id).all(),
      ]);

      project.steps = steps.results;
      project.parts = parts.results;
      project.tools = tools.results;
      project.fsmSections = fsm.results;
    }

    return Response.json({ projects: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    if (!body.vehicle_id || !body.title || !body.module) {
      return Response.json(
        { error: 'vehicle_id, title, and module are required' },
        { status: 400 }
      );
    }
    const id = `${body.vehicle_id}-${Date.now()}`;
    await env.DB.prepare(
      `INSERT INTO projects (id, vehicle_id, title, status, module, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, body.vehicle_id, body.title, body.status || 'planned',
           body.module, body.notes)
     .run();
    return Response.json({ id, success: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPatch(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    if (!body.id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    const updates = [];
    const binds = [];

    if (body.status != null) {
      updates.push('status = ?');
      binds.push(body.status);
    }
    if (body.notes != null) {
      updates.push('notes = ?');
      binds.push(body.notes);
    }
    if (body.title != null) {
      updates.push('title = ?');
      binds.push(body.title);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    binds.push(body.id);

    const result = await env.DB.prepare(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...binds).run();

    if (result.meta.changes === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
