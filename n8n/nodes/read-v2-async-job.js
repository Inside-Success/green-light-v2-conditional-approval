// Read V2 Async Job - answers the dashboard's status poll.
// Source of truth: the "Green Light V2 - async jobs" Data Table row for this job (written once, at completion,
// so a concurrent execution can never overwrite it). Fallback: the legacy static-data store, which still
// tracks queued/processing state and is the only record for jobs created before the Data Table existed.
const webhook = $('V2 Async Status Webhook').first().json || {};
const query = webhook.query || {};
const body = webhook.body || {};
const jobId = String(query.job_id || query.jobId || body.job_id || body.jobId || '').trim();
if (!jobId) {
  return [{ json: { ok: false, status: 'missing_job_id', error: 'Missing job_id.' } }];
}

let row = {};
try { row = $input.first().json || {}; } catch (error) { row = {}; }
if (row && row.job_id === jobId && ['complete', 'failed'].includes(String(row.status || '')) && row.payload) {
  try {
    const payload = JSON.parse(row.payload);
    if (payload && typeof payload === 'object') {
      return [{ json: { ...payload, job_id: jobId, status: row.status, source: 'datatable' } }];
    }
  } catch (error) {
    // Malformed row: fall through to the legacy store.
  }
}

const store = $getWorkflowStaticData('global');
const jobs = store.v2_async_jobs || {};
const job = jobs[jobId];
if (!job) {
  return [{
    json: {
      ok: true,
      status: 'processing',
      job_id: jobId,
      progress: 'Generation is still starting...',
      pending_persistence: true,
    }
  }];
}
const ageMs = Date.now() - Date.parse(job.created_at || job.updated_at || new Date().toISOString());
if (!['complete', 'failed'].includes(job.status) && ageMs > 10 * 60 * 1000) {
  job.status = 'failed';
  job.ok = false;
  job.error = 'Generation timed out before a draft was available. Please try again or use the speed fallback.';
  job.updated_at = new Date().toISOString();
}
return [{ json: job }];
