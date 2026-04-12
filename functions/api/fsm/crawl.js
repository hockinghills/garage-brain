// FSM Crawler — Discovers and downloads factory service manual PDFs
// POST /api/fsm/crawl — start a crawl job
// GET /api/fsm/crawl?job_id=xxx — check crawl status
//
// Supports: NICOclub (Nissan/Infiniti), with extensible source pattern
//
// NICOclub URL patterns:
//   Main page: https://www.nicoclub.com/nissan-service-manuals
//   Infiniti:  https://www.nicoclub.com/infiniti-service-manuals
//   Viewer:    https://www.nicoclub.com/service-manual?fsm=Leaf/2013/FSU.pdf
//   Direct DL: https://www.nicoclub.com/service-manual?fsm_download=Leaf/2013/FSU.pdf

// Known NICOclub FSM section codes for common models
// These are the standard Nissan FSM abbreviation codes
const KNOWN_SECTIONS = {
  "Leaf/2013": [
    { code: "FWD", name: "Intro - Table of Contents" },
    { code: "ACC", name: "Accelerator Control System" },
    { code: "AVN", name: "Audio, Visual and Navigation System" },
    { code: "BCS", name: "Body Control System" },
    { code: "BR", name: "Brake System" },
    { code: "BRC", name: "Brake Control System" },
    { code: "BRM", name: "Body Repair Manual" },
    { code: "CCS", name: "Cruise Control System" },
    { code: "CHG", name: "Charging System" },
    { code: "DEF", name: "Defogger" },
    { code: "DLK", name: "Door and Lock" },
    { code: "EVB", name: "EVB - EV Battery" },
    { code: "EVC", name: "EVC - EV Control" },
    { code: "EXL", name: "Exterior Lighting System" },
    { code: "EXT", name: "Exterior" },
    { code: "FAX", name: "Front Axle" },
    { code: "FSU", name: "Front Suspension" },
    { code: "GW", name: "Glass and Window System" },
    { code: "HA", name: "Heater and Air Conditioning System" },
    { code: "HAC", name: "Heater and Air Conditioning Control System" },
    { code: "HCO", name: "HCO" },
    { code: "HRN", name: "Horn" },
    { code: "ILL", name: "Interior Lighting System" },
    { code: "INT", name: "Interior" },
    { code: "IP", name: "Instrument Panel" },
    { code: "LAN", name: "LAN System" },
    { code: "MA", name: "Maintenance" },
    { code: "MIR", name: "Mirrors" },
    { code: "MWI", name: "Meter, Warning Lamp and Indicator" },
    { code: "PB", name: "Parking Brake System" },
    { code: "PCS", name: "Power Control System" },
    { code: "PG", name: "Power Supply, Ground and Circuit Elements" },
    { code: "PWC", name: "Power Window Control System" },
    { code: "PWO", name: "Power Outlet" },
    { code: "RAX", name: "Rear Axle" },
    { code: "RSU", name: "Rear Suspension" },
    { code: "SB", name: "Seat Belt" },
    { code: "SE", name: "Seat" },
    { code: "SEC", name: "Security Control System" },
    { code: "SRS", name: "SRS Airbag" },
    { code: "SRSC", name: "SRS Airbag Control System" },
    { code: "ST", name: "Steering System" },
    { code: "STC", name: "Steering Control System" },
    { code: "TM", name: "Transaxle and Transmission" },
    { code: "TMS", name: "TMS" },
    { code: "VC", name: "VC" },
    { code: "VTL", name: "Ventilation System" },
    { code: "WCS", name: "Warning Chime System" },
    { code: "WT", name: "Road Wheels and Tires" },
    { code: "WW", name: "Wiper and Washer" },
  ],
};

// Source registry — add new FSM sources here
const SOURCES = {
  nicoclub_nissan: {
    name: "NICOclub — Nissan",
    baseUrl: "https://www.nicoclub.com",
    indexUrl: "https://www.nicoclub.com/nissan-service-manuals",
    pdfPattern: (model, year, section) =>
      `https://www.nicoclub.com/service-manual?fsm_download=${model}/${year}/${section}.pdf`,
    viewerPattern: (model, year, section) =>
      `https://www.nicoclub.com/service-manual?fsm=${model}/${year}/${section}.pdf`,
    models: ["Leaf", "Altima", "Maxima", "Frontier", "Pathfinder", "Sentra", "Rogue", "Titan", "Xterra", "350Z", "370Z"],
  },
  nicoclub_infiniti: {
    name: "NICOclub — Infiniti",
    baseUrl: "https://www.nicoclub.com",
    indexUrl: "https://www.nicoclub.com/infiniti-service-manuals",
    pdfPattern: (model, year, section) =>
      `https://www.nicoclub.com/service-manual?fsm_download=${model}/${year}/${section}.pdf`,
    models: ["QX60", "QX56", "QX80", "Q50", "G35", "G37", "M35", "M45", "FX35", "FX45"],
  },
};

// Crawl strategy:
// 1. Try known sections first (fast, no scraping needed)
// 2. If model not in KNOWN_SECTIONS, use Browser Rendering to discover links
// 3. Download each PDF with delays to respect rate limiting
// 4. Store in R2, record in D1

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { vehicle_id, source, model, year } = body;

    if (!vehicle_id || !source || !model || !year) {
      return Response.json(
        { error: "vehicle_id, source, model, and year required" },
        { status: 400 }
      );
    }

    const sourceConfig = SOURCES[source];
    if (!sourceConfig) {
      return Response.json(
        { error: `Unknown source: ${source}. Available: ${Object.keys(SOURCES).join(", ")}` },
        { status: 400 }
      );
    }

    // Check for known sections first
    const knownKey = `${model}/${year}`;
    const sections = KNOWN_SECTIONS[knownKey];

    if (sections) {
      // Fast path — we know the sections, just build the download list
      const jobId = `crawl-${vehicle_id}-${Date.now()}`;

      // Store the job in KV for status tracking
      await env.CACHE.put(
        `job:${jobId}`,
        JSON.stringify({
          id: jobId,
          vehicle_id,
          source,
          model,
          year,
          status: "discovering",
          sections: sections.map((s) => ({
            code: s.code,
            name: s.name,
            url: sourceConfig.pdfPattern(model, year, s.code),
            status: "pending",
            r2Key: null,
            error: null,
          })),
          total: sections.length,
          downloaded: 0,
          failed: 0,
          startedAt: new Date().toISOString(),
        }),
        { expirationTtl: 86400 } // 24h TTL
      );

      // Job created — frontend polls GET for status and calls
      // POST /api/fsm/crawl/continue?job_id=XXX to process batches.
      // No waitUntil — single-writer model avoids KV race conditions.

      return Response.json({
        jobId,
        message: `Found ${sections.length} known sections for ${model} ${year}. Call /continue to start downloading.`,
        sections: sections.map((s) => ({ code: s.code, name: s.name })),
        hint: "POST /api/fsm/crawl/continue?job_id=XXX to download next batch. Poll GET for status.",
      });
    }

    // Slow path — need to discover sections via Browser Rendering
    // For now, return a helpful message about manual discovery
    return Response.json({
      message: `No pre-mapped sections for ${model} ${year}. Use the manual discovery endpoint or add sections to KNOWN_SECTIONS.`,
      hint: "POST to /api/fsm/crawl/discover with the same params to use Browser Rendering",
      availableKnown: Object.keys(KNOWN_SECTIONS),
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// All download work is now done via /api/fsm/crawl/continue.js
// Single-writer model: no background processing, no race conditions.
// Frontend calls /continue repeatedly to process batches.

// GET — check crawl job status
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const jobId = url.searchParams.get("job_id");

  if (!jobId) {
    // List available sources and known models
    return Response.json({
      sources: Object.entries(SOURCES).map(([id, s]) => ({
        id,
        name: s.name,
        models: s.models,
      })),
      knownSections: Object.entries(KNOWN_SECTIONS).map(([key, sections]) => ({
        modelYear: key,
        sectionCount: sections.length,
      })),
    });
  }

  const jobData = await env.CACHE.get(`job:${jobId}`, { type: "json" });
  if (!jobData) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json(jobData);
}
