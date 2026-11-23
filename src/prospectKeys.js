// Prospect duplicate keys >> the same rules the Prospects page uses (src/App2.jsx ProspectsPage, "Prospect duplicate
// detection"), as one module the server can use too (api/plan.js). A prospect is the same person as an existing one
// when ANY key collides: name + company, email, LinkedIn URL, phone (last 10 digits), or the name alone when nothing
// else identifies the row. tests/reliability/planner-test.mjs proves these keys equal the page's keys.
export const normProspectText = (s) => String(s || '').toLowerCase().replace(/['‘’`]/g, '').replace(/[.,"“”&()\/\\]/g, ' ').replace(/\s+/g, ' ').trim();
export const normProspectCompany = (s) => { let n = normProspectText(s); if (n.startsWith('the ')) n = n.slice(4); n = n.replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|the)\b/g, ' ').replace(/\s+/g, ' ').trim(); return n; };
export const normProspectEmail = (s) => String(s || '').toLowerCase().trim();
export const normProspectLinkedin = (s) => String(s || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
export const normProspectPhone = (s) => { const d = String(s || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : ''; };
export function prospectKeys(p) {
  const name = normProspectText(p && p.name), company = normProspectCompany(p && p.company), email = normProspectEmail(p && p.email);
  const linkedin = normProspectLinkedin(p && p.linkedin), phone = normProspectPhone(p && p.phone);
  const keys = [];
  if (name && company) keys.push('nc:' + name + '|' + company);
  if (email) keys.push('e:' + email);
  if (linkedin) keys.push('l:' + linkedin);
  if (phone) keys.push('p:' + phone);
  if (name && !company && !email && !linkedin && !phone) keys.push('n:' + name);
  return keys;
}
// The existing prospect a new one duplicates, or null. prospects: [{ id, ...fields }]
export function findDuplicateProspect(prospects, candidate) {
  const want = new Set(prospectKeys(candidate));
  if (!want.size) return null;
  for (const p of Array.isArray(prospects) ? prospects : []) if (prospectKeys(p).some((k) => want.has(k))) return p;
  return null;
}
