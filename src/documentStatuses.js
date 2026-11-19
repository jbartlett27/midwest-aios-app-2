export const DOCUMENT_STATUSES_ID = 'DOC_STATUSES_GLOBAL';
const BROWSER_STATUS_KEY = 'mw_doc_statuses_fallback';

export function parseDocumentStatuses(content) {
  try {
    const statuses = JSON.parse(content);
    return statuses && typeof statuses === 'object' && !Array.isArray(statuses) ? statuses : {};
  } catch {
    return {};
  }
}

export function readDocumentStatuses(jobs, records) {
  const jobStatuses = Object.assign({}, ...jobs.map(job => job.docStatuses || {}));
  const statusRecord = records?.find(row => row.id === DOCUMENT_STATUSES_ID);
  const shared = parseDocumentStatuses(statusRecord?.content);
  let cache = {};
  try {
    cache = parseDocumentStatuses(localStorage.getItem(BROWSER_STATUS_KEY));
  } catch {}
  // Once the shared registry loads, bill status comes from durable records.
  // A cached payment must not reappear after it is removed in another session.
  for (const key of Object.keys(cache)) {
    if (key.startsWith('BILL-') && (statusRecord || Object.hasOwn(jobStatuses, key))) {
      delete cache[key];
    }
  }
  return {...jobStatuses, ...shared, ...cache};
}

export function documentStatusChanges(before, after, keys) {
  const snapshot = (statuses, key) => Object.hasOwn(statuses, key) ? [statuses[key]] : [];
  return Object.fromEntries([...keys].map(key => [key, {
    before: snapshot(before, key),
    after: snapshot(after, key),
  }]));
}
