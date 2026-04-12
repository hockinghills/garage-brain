// GET /api/vehicles — list all vehicles
// POST /api/vehicles — create a vehicle
//
// Bindings available: env.DB (D1), env.STORAGE (R2), env.AI

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM vehicles ORDER BY year DESC'
    ).all();
    return Response.json({ vehicles: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    if (!body?.make || !body?.model || body?.year == null) {
      return Response.json({ error: 'make, model, and year required' }, { status: 400 });
    }
    const id = `${body.make}-${body.model}-${body.year}`.toLowerCase().replace(/\s+/g, '-');
    await env.DB.prepare(
      `INSERT INTO vehicles (id, year, make, model, color, icon, bolt_pattern, obd_protocol, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, body.year, body.make, body.model, body.color || '#888',
           body.icon || '🚗', body.bolt_pattern, body.obd_protocol, body.notes)
     .run();
    return Response.json({ id, success: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
