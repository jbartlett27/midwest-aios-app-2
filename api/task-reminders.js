// ═══════════════════════════════════════════════════════════════
// TASK DUE-DATE REMINDERS -- Vercel Cron, once daily
// ═══════════════════════════════════════════════════════════════
// The sales team's ask (Maureen, Sep 4 2026): a task set for a future date
// used to email the assignee the moment it was CREATED, which is the one day
// they do not need reminding. The reminder now arrives on the morning of the
// day the task is actually set for.
//
// Scheduled from vercel.json as a daily cron. Vercel Hobby fires a daily cron
// somewhere inside the named hour, so 12:00 UTC lands between 7:00 and 7:59am
// Central -- before the workday, which is the point.
//
// Deliberately written with plain fetch() and no npm packages, matching
// src/supabase.js ("Pure fetch(), zero npm packages"). Nothing new to install,
// nothing new that can fail at build time.

const SUPABASE_REST = 'https://kogjthgceejpzxnekprr.supabase.co/rest/v1';
// Same anon key the browser already uses to read and write sops. If a service
// role key is present on the server we prefer it, but the anon key is the
// proven path -- the app writes tasks with it every day.
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZ2p0aGdjZWVqcHp4bmVrcHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODgyODUsImV4cCI6MjA4ODg2NDI4NX0.W0bhVfPNjCPYKzs6KpIeYaXk5epKRbLmDzgSN8NEjHo';
const CANONICAL_ORIGIN = 'https://midwestaios.com';
const TASK_TZ = 'America/Chicago';
// If the cron misses a day (a deploy window, an outage), a task due yesterday
// would otherwise never be announced at all. Look back a week and catch it.
// The per-task marker below means nobody is ever emailed about it twice.
const CATCHUP_DAYS = 7;
const SENDER = 'tasks@mwfurnishings.com';

// Today's calendar date in Midwest's own timezone. Task due dates are bare
// YYYY-MM-DD strings with no timezone, so "today" has to be Chicago's today,
// not the server's UTC today -- otherwise every reminder fires a day early for
// the last 5 hours of each Central day.
const todayInTz = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: TASK_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const isDateStr = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v == null ? '' : v).trim());
const daysApart = (from, to) =>
  Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sbHeaders = (key) => ({
  'apikey': key,
  'Authorization': 'Bearer ' + key,
  'Content-Type': 'application/json',
});

// The reminder body. Same shape as the in-app task notification so the two do
// not read like they came from different systems.
function buildHtml(task, today) {
  const due = String(task.due || '');
  const late = isDateStr(due) ? daysApart(due, today) : 0;
  const heading = late > 0
    ? 'This task was due ' + late + ' day' + (late === 1 ? '' : 's') + ' ago'
    : 'This task is due today';
  const rows = [];
  rows.push(['Due', esc(due)]);
  rows.push(['Status', esc(task.status || 'To Do')]);
  if (task.jobName) rows.push(['Project', esc(task.jobName)]);
  if (task.customerName) rows.push(['Customer', esc(task.customerName)]);
  if (task.vendorName) rows.push(['Vendor', esc(task.vendorName)]);
  if (task.prospectName) rows.push(['Prospect', esc(task.prospectName)]);
  if (task.priority && task.priority !== 'normal') rows.push(['Priority', esc(task.priority).toUpperCase()]);
  const meta = rows.map(([k, v]) =>
    '<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;vertical-align:top;white-space:nowrap">' + k +
    '</td><td style="padding:4px 0;font-size:13px;color:#111">' + v + '</td></tr>').join('');
  const notesBlock = task.notes
    ? '<div style="margin-top:14px;padding:10px 14px;background:#f7f7f5;border-left:3px solid #d4d4d4;font-size:13px;color:#333;line-height:1.55;white-space:pre-wrap">' + esc(task.notes) + '</div>'
    : '';
  const linkBlock = task.link
    ? '<div style="margin-top:12px;font-size:13px"><a href="' + esc(task.link) + '" style="color:#2dd4bf;text-decoration:underline">' + esc(task.link) + '</a></div>'
    : '';
  return '<div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:24px;max-width:600px;margin:0 auto">' +
    '<div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px">Midwest AIOS &middot; Task Reminder</div>' +
    '<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:14px">' + heading + '</div>' +
    '<div style="font-size:16px;font-weight:600;color:#111;margin-bottom:10px;padding:12px 14px;background:#f7f7f5;border-radius:6px">' + esc(task.text || 'Untitled task') + '</div>' +
    '<table style="border-collapse:collapse;margin-top:6px">' + meta + '</table>' +
    notesBlock + linkBlock +
    '<div style="margin-top:22px;font-size:13px;color:#555;line-height:1.6">Open <a href="' + CANONICAL_ORIGIN + '/tasks" style="color:#2dd4bf;text-decoration:underline">Midwest AIOS &rsaquo; Tasks</a> to update it.</div>' +
    '<div style="margin-top:22px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px">Sent automatically by Midwest AIOS on the day this task was set for.</div>' +
    '</div>';
}

export default async function handler(req, res) {
  // If CRON_SECRET is configured, require it. If it is not configured, run
  // anyway -- a cron that silently refuses itself is worse than an open
  // endpoint here, and the whole job is idempotent: the per-task marker means
  // an extra trigger cannot double-send.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    const isCron = !!req.headers['x-vercel-cron'];
    if (!isCron && auth !== 'Bearer ' + secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const dry = String((req.query && req.query.dry) || '') === '1';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;
  const today = todayInTz();

  try {
    const [taskRes, repRes] = await Promise.all([
      fetch(SUPABASE_REST + '/sops?cat=eq.Task&select=id,content', { headers: sbHeaders(key) }),
      fetch(SUPABASE_REST + '/reps?select=name,email', { headers: sbHeaders(key) }),
    ]);
    if (!taskRes.ok) return res.status(502).json({ error: 'Could not read tasks: ' + taskRes.status });
    if (!repRes.ok) return res.status(502).json({ error: 'Could not read reps: ' + repRes.status });
    const rows = await taskRes.json();
    const reps = await repRes.json();

    const emailFor = {};
    (Array.isArray(reps) ? reps : []).forEach(r => {
      if (r && r.name && r.email) emailFor[String(r.name).trim().toLowerCase()] = String(r.email).trim();
    });

    const due = [];
    (Array.isArray(rows) ? rows : []).forEach(row => {
      let t = null;
      try { t = JSON.parse(row.content || '{}'); } catch { return; }
      if (!t || typeof t !== 'object') return;
      const d = String(t.due == null ? '' : t.due).trim();
      if (!isDateStr(d)) return;                       // no due date, nothing to schedule
      if (d > today) return;                            // still in the future, not yet
      if (daysApart(d, today) > CATCHUP_DAYS) return;   // too old to start shouting about
      if ((t.status || 'To Do') === 'Done') return;     // already finished
      if (t.dueNotifiedFor === d) return;               // already announced for THIS due date
      const names = Array.isArray(t.assignees) ? t.assignees : [];
      if (names.length === 0) return;                   // nobody to tell
      due.push({ id: row.id, task: t, dueDate: d, names });
    });

    const sent = [], failed = [], skipped = [];
    for (const item of due) {
      const targets = [];
      item.names.forEach(n => {
        const addr = emailFor[String(n).trim().toLowerCase()];
        if (addr) targets.push({ name: n, email: addr });
        else skipped.push({ task: item.task.text, name: n, reason: 'no email on record' });
      });
      if (targets.length === 0) continue;

      const html = buildHtml(item.task, today);
      const subject = (item.dueDate === today ? 'Task Due Today: ' : 'Task Overdue: ') + (item.task.text || 'Untitled task');

      if (dry) {
        sent.push({ task: item.task.text, due: item.dueDate, to: targets.map(t => t.email) });
        continue;
      }

      let anyOk = false;
      for (const t of targets) {
        try {
          // Reuse the app's own email endpoint so the sender rules, validation
          // and Resend handling stay in exactly one place.
          const r = await fetch(CANONICAL_ORIGIN + '/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: t.email, from: SENDER, subject, html }),
          });
          if (r.ok) { anyOk = true; sent.push({ task: item.task.text, to: t.email }); }
          else {
            const d2 = await r.json().catch(() => ({}));
            failed.push({ task: item.task.text, to: t.email, error: d2.error || r.status });
          }
        } catch (e) {
          failed.push({ task: item.task.text, to: t.email, error: e.message || 'network' });
        }
      }

      // Only mark it announced once something actually went out, so a bad send
      // is retried tomorrow instead of being silently swallowed forever.
      if (anyOk) {
        try {
          await fetch(SUPABASE_REST + '/sops?id=eq.' + encodeURIComponent(item.id), {
            method: 'PATCH',
            headers: { ...sbHeaders(key), 'Prefer': 'return=minimal' },
            body: JSON.stringify({ content: JSON.stringify({ ...item.task, dueNotifiedFor: item.dueDate }) }),
          });
        } catch {}
      }
    }

    return res.status(200).json({
      ok: true, dryRun: dry, today,
      scanned: Array.isArray(rows) ? rows.length : 0,
      dueNow: due.length, sent, failed, skipped,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Reminder run failed: ' + (err && err.message) });
  }
}
