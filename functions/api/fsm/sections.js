// GET /api/fsm/sections?vehicle_id=xxx — list FSM sections for a vehicle

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get('vehicle_id');

  if (!vehicleId) {
    return Response.json({ error: 'vehicle_id required' }, { status: 400 });
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM fsm_sections WHERE vehicle_id = ? ORDER BY title'
    ).bind(vehicleId).all();
    return Response.json({ sections: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
