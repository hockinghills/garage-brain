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

  // Find next batch of pending or blocked (retryable) sections
  const MAX_RETRIES = 3;
  const pendingIdxs = [];
  for (let i = 0; i < jobData.sections.length && pendingIdxs.length < BATCH_SIZE; i++) {
    const s = jobData.sections[i];
    if (s.status === 'pending') {
      pendingIdxs.push(i);
    } else if (s.status === 'blocked' && (s.retryCount || 0) < MAX_RETRIES) {
      // Reset to pending for retry
      s.status = 'pending';
      pendingIdxs.push(i);
    }
  }

  if (pendingIdxs.length === 0) {
    const inProgressCount = jobData.sections.filter(s => s.status === 'in_progress').length;
    if (inProgressCount > 0) {
      return Response.json(
        { message: 'A batch is still processing; retry shortly.', inProgress: inProgressCount, ...jobData },
        { status: 409 }
      );
    }
    const blockedCount = jobData.sections.filter(s => s.status === 'blocked').length;
    if (blockedCount > 0) {
      jobData.status = 'blocked';
      jobData.completedAt = new Date().toISOString();
      await env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), { expirationTtl: 86400 });
      return Response.json({
        message: `${blockedCount} section(s) blocked by rate limiting after ${MAX_RETRIES} retries. Try again later.`,
        blocked: blockedCount,
        ...jobData,
      });
    }
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
  let hitRateLimit = false;

  for (let idx = 0; idx < pendingIdxs.length; idx++) {
    const i = pendingIdxs[idx];
    const section = jobData.sections[i];

    // If we've been rate-limited, mark remaining in this batch as blocked (retryable)
    if (hitRateLimit) {
      section.status = 'blocked';
      section.error = 'Rate limited — will retry in next batch';
      section.retryCount = (section.retryCount || 0);
      continue;
    }

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
          // Got HTML instead of PDF — check if it's a Cloudflare block or a real missing file
          let body = '';
          try { body = await response.text(); } catch { /* ignore */ }

          const isBlocked = body.includes('you have been blocked')
            || body.includes('Attention Required')
            || body.includes('challenge-platform')
            || body.includes('cf-challenge')
            || body.includes('Just a moment');

          if (isBlocked) {
            // Cloudflare rate limit — retryable, stop processing this batch
            section.status = 'blocked';
            section.error = 'Rate limited by Cloudflare — will retry with longer delay';
            section.retryCount = (section.retryCount || 0) + 1;
            hitRateLimit = true;
            // Don't increment jobData.failed — this is retryable
          } else {
            // Genuinely not a PDF and not a rate limit — still mark as retryable
            // because we can't be sure from a server-side fetch alone
            section.status = 'blocked';
            section.error = `Got HTML instead of PDF — may be rate limited or file path may differ`;
            section.retryCount = (section.retryCount || 0) + 1;
          }
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
            `INSERT INTO fsm_sections (vehicle_id, title, r2_key)
             SELECT ?, ?, ?
             WHERE NOT EXISTS (
               SELECT 1 FROM fsm_sections WHERE vehicle_id = ? AND title = ?
             )`
          ).bind(
            jobData.vehicle_id,
            `${section.code} — ${section.name}`,
            r2Key,
            jobData.vehicle_id,
            `${section.code} — ${section.name}`
          ).run();

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

    // Rate limit between downloads — longer delay if we've seen blocks recently
    if (idx < pendingIdxs.length - 1) {
      const hasBlocks = jobData.sections.some(s => s.status === 'blocked');
      const delay = hasBlocks ? 8000 : 3000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Check if all done
  const remaining = jobData.sections.filter(s => s.status === 'pending').length;
  const blocked = jobData.sections.filter(s => s.status === 'blocked').length;
  const inProgress = jobData.sections.filter(s => s.status === 'in_progress').length;
  if (remaining === 0 && inProgress === 0 && blocked === 0) {
    jobData.status = jobData.failed === 0 ? 'complete' : 'partial';
    jobData.completedAt = new Date().toISOString();
  } else if (remaining === 0 && inProgress === 0 && blocked > 0) {
    // Don't mark as complete — there are retryable sections
    jobData.status = 'has_blocked';
  }

  await env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), { expirationTtl: 86400 });

  const message = remaining > 0
    ? `Processed ${pendingIdxs.length} sections. ${remaining} remaining — call /continue again.`
    : blocked > 0
      ? `${jobData.downloaded} downloaded, ${blocked} blocked by rate limiting — call /continue to retry.`
      : `All sections processed. ${jobData.downloaded} downloaded, ${jobData.failed} failed.`;

  return Response.json({
    batchProcessed: pendingIdxs.length,
    remaining,
    blocked,
    downloaded: jobData.downloaded,
    failed: jobData.failed,
    status: jobData.status,
    message,
  });
}
