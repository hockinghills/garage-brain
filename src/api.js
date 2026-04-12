// Garage Brain — API client
// Talks to Cloudflare Pages Functions endpoints

const API_BASE = "/api";

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// --- Vehicles ---
export async function fetchVehicles() {
  const { vehicles } = await request("/vehicles");
  return vehicles;
}

export async function createVehicle(vehicle) {
  return request("/vehicles", {
    method: "POST",
    body: JSON.stringify(vehicle),
  });
}

// --- Projects ---
export async function fetchProjects(vehicleId) {
  const qs = vehicleId ? `?vehicle_id=${encodeURIComponent(vehicleId)}` : "";
  const { projects } = await request(`/projects${qs}`);
  return projects;
}

export async function createProject(project) {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify(project),
  });
}

export async function updateProject(id, updates) {
  return request("/projects", {
    method: "PATCH",
    body: JSON.stringify({ id, ...updates }),
  });
}

// --- Steps ---
export async function toggleStep(stepId, done) {
  return request("/steps", {
    method: "PATCH",
    body: JSON.stringify({ id: stepId, done: done ? 1 : 0 }),
  });
}

export async function addStep(projectId, text, sortOrder) {
  return request("/steps", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, text, sort_order: sortOrder }),
  });
}

// --- Parts ---
export async function addPart(projectId, part) {
  return request("/parts", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, ...part }),
  });
}

// --- Journal ---
export async function addJournalEntry(projectId, entry) {
  return request("/journal", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, entry }),
  });
}

export async function fetchJournal(projectId) {
  const { entries } = await request(`/journal?project_id=${encodeURIComponent(projectId)}`);
  return entries;
}

// --- FSM ---
export async function searchFSM(query, vehicleId) {
  const qs = new URLSearchParams({ q: query });
  if (vehicleId) qs.set("vehicle_id", vehicleId);
  return request(`/fsm?${qs}`);
}

export async function startFSMCrawl(vehicleId, source, model, year) {
  return request("/fsm/crawl", {
    method: "POST",
    body: JSON.stringify({ vehicle_id: vehicleId, source, model, year }),
  });
}

export async function continueFSMCrawl(jobId) {
  return request(`/fsm/crawl/continue?job_id=${encodeURIComponent(jobId)}`, {
    method: "POST",
  });
}

export async function getCrawlStatus(jobId) {
  return request(`/fsm/crawl?job_id=${encodeURIComponent(jobId)}`);
}
