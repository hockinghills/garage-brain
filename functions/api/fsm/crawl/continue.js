// POST /api/fsm/crawl/continue?job_id=xxx — process next batch of downloads
// Called by the frontend after polling shows more sections pending
//
// This avoids the long-running waitUntil problem by processing
// BATCH_SIZE sections per request, staying well within Workers CPU limits.

const BATCH_SIZE = 5;

export async function onRequestPost(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    return Response.json({ error: 'job_id parameter required' }, { status: 400 });
  }

  const jobData = await env.CACHE.get(`job:${jobId}`, { type: 'json' });
  if (!jobData) {
    return Response.json({ error: 'Job not found or expired' }, { status: 404 });
  }

  if (jobData.status === 'complete' || jobData.status === 'failed') {
    return Response.json({ message: 'Job already finished', ...jobData });
  }

  // Find next batch of pending sections
  const pendingIdxs = [];
  for (let i = 0; i < jobData.sections.length && pendingIdxs.length < BATCH_SIZE; i++) {
    if (jobData.sections[i].status === 'pending') {
      pendingIdxs.push(i);
    }
  }

  if (pendingIdxs.length === 0) {
    jobData.status = jobData.failed === 0 ? 'complete' : 'partial';
    jobData.completedAt = new Date().toISOString();
    await env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), { expirationTtl: 86400 });
    return Response.json({ message: 'No pending sections', ...jobData });
  }

  // Mark this batch as in_progress to prevent duplicate processing
  for (const i of pendingIdxs) {
    jobData.sections[i].status = 'in_progress';
  }
  await env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), { expirationTtl: 86400 });

  // Process this batch
  for (let idx = 0; idx < pendingIdxs.length; idx++) {
    const i = pendingIdxs[idx];
    const section = jobData.sections[i];

    try {
      const response = await fetch(section.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GarageBrain/1.0; personal use)',
          'Referer': 'https://www.nicoclub.com/nissan-service-manuals',
        },
      });

      if (!response.ok) {
        section.status = 'failed';
        section.error = `HTTP ${response.status}`;
        jobData.failed++;
      } else {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
          section.status = 'failed';
          section.error = `Not a PDF (got ${contentType})`;
          jobData.failed++;
        } else {
          const r2Key = `fsm/${jobData.vehicle_id}/${jobData.year}/${section.code}.pdf`;
          await env.STORAGE.put(r2Key, response.body, {
            httpMetadata: { contentType: 'application/pdf' },
            customMetadata: {
              vehicleId: jobData.vehicle_id,
              model: jobData.model,
              year: String(jobData.year),
              sectionCode: section.code,
              sectionName: section.name,
              source: jobData.source,
              downloadedAt: new Date().toISOString(),
            },
          });

          await env.DB.prepare(
            `INSERT OR REPLACE INTO fsm_sections (vehicle_id, title, r2_key) VALUES (?, ?, ?)`
          ).bind(jobData.vehicle_id, `${section.code} — ${section.name}`, r2Key).run();

          section.status = 'done';
          section.r2Key = r2Key;
          jobData.downloaded++;
        }
      }
    } catch (e) {
      section.status = 'failed';
      section.error = e.message;
      jobData.failed++;
    }

    // Rate limit between downloads
    if (idx < pendingIdxs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Check if all done
  const remaining = jobData.sections.filter(s => s.status === 'pending').length;
  const inProgress = jobData.sections.filter(s => s.status === 'in_progress').length;
  if (remaining === 0 && inProgress === 0) {
    jobData.status = jobData.failed === 0 ? 'complete' : 'partial';
    jobData.completedAt = new Date().toISOString();
  }

  await env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), { expirationTtl: 86400 });

  return Response.json({
    batchProcessed: pendingIdxs.length,
    remaining,
    downloaded: jobData.downloaded,
    failed: jobData.failed,
    status: jobData.status,
    message: remaining > 0
      ? `Processed ${pendingIdxs.length} sections. ${remaining} remaining — call /continue again.`
      : `All sections processed. ${jobData.downloaded} downloaded, ${jobData.failed} failed.`,
  });
}
