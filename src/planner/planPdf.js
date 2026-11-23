// The Furniture Planner's planning quote as a real PDF file (pdf-lib, made in the browser). No prices and no price
// columns, by design: this is a plan, not an offer. Letter size, Midwest's logo, a header and footer on every page,
// and table rows that never split across a page break.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const INK = rgb(0.07, 0.08, 0.09), SOFT = rgb(0.38, 0.41, 0.45), LINE = rgb(0.86, 0.88, 0.9), BLUE = rgb(0.25, 0.78, 0.96), LIME = rgb(0.83, 0.88, 0.36), WASH = rgb(0.965, 0.972, 0.98);
const W = 612, Hh = 792, M = 48;
// Standard PDF fonts only know Latin-1: anything else becomes a plain equivalent so the file always opens.
const safe = (s) => String(s == null ? '' : s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2022/g, '-').replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '');

function wrap(text, font, size, width) {
  const out = [];
  for (const para of safe(text).split(/\n/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(t, size) <= width) { line = t; continue; }
      if (line) out.push(line);
      let w = word; while (font.widthOfTextAtSize(w, size) > width && w.length > 1) { let k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > width) k--; out.push(w.slice(0, k)); w = w.slice(k); }
      line = w;
    }
    out.push(line);
  }
  return out.length ? out : [''];
}

export async function buildPlanPdf({ plan, contact, logoBytes, refId, date = new Date() }) {
  const doc = await PDFDocument.create();
  doc.setTitle('Midwest Planning Quote ' + refId); doc.setAuthor('Midwest Educational Furnishings'); doc.setSubject('Planning quote (not a priced offer)');
  const reg = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = logoBytes ? await doc.embedPng(logoBytes) : null;
  const pages = []; let page, y;
  const newPage = () => {
    page = doc.addPage([W, Hh]); pages.push(page);
    page.drawRectangle({ x: 0, y: Hh - 6, width: W / 2, height: 6, color: BLUE }); page.drawRectangle({ x: W / 2, y: Hh - 6, width: W / 2, height: 6, color: LIME });
    if (logo) { const s = 44 / logo.height; page.drawImage(logo, { x: M, y: Hh - 30 - 44, width: logo.width * s, height: 44 }); }
    page.drawText('PLANNING QUOTE', { x: W - M - bold.widthOfTextAtSize('PLANNING QUOTE', 9), y: Hh - 46, size: 9, font: bold, color: SOFT });
    page.drawText(safe(refId), { x: W - M - reg.widthOfTextAtSize(safe(refId), 9), y: Hh - 60, size: 9, font: reg, color: SOFT });
    y = Hh - 100;
  };
  const need = (h) => { if (y - h < 64) newPage(); };
  const text = (s, { x = M, size = 10, font = reg, color = INK, width = W - 2 * M, gap = 4 } = {}) => {
    for (const l of wrap(s, font, size, width)) { need(size + gap); page.drawText(l, { x, y: y - size, size, font, color }); y -= size + gap; }
  };
  newPage();
  text('Your furniture plan', { size: 22, font: bold, gap: 6 });
  text('Prepared ' + date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' with the Midwest Furniture Planner', { size: 10, color: SOFT }); y -= 6;
  // The notice that this is not a priced offer, on page one.
  need(44); page.drawRectangle({ x: M, y: y - 40, width: W - 2 * M, height: 40, color: WASH, borderColor: LINE, borderWidth: 0.8 });
  page.drawText('Planning quote, not a priced offer.', { x: M + 12, y: y - 17, size: 10, font: bold, color: INK });
  page.drawText('Products, quantities and options for review. Pricing, availability and lead times are confirmed by Midwest.', { x: M + 12, y: y - 31, size: 8.5, font: reg, color: SOFT });
  y -= 56;
  const section = (t) => { need(40); y -= 6; page.drawText(safe(t).toUpperCase(), { x: M, y: y - 9, size: 9, font: bold, color: SOFT }); y -= 16; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: LINE }); y -= 10; };
  const pr = plan.project || {};
  const facts = [['Prepared for', [contact && contact.name, contact && contact.company].filter(Boolean).join(', ')], ['Space', pr.room], ['Organization', pr.organization], ['People', pr.headcount], ['Dimensions', pr.dimensions], ['Age group', pr.age_group], ['Location', pr.location], ['Timeline', pr.timeline], ['Constraints', pr.constraints]].filter(([, v]) => v);
  if (facts.length) {
    section('Project');
    for (const [k, v] of facts) { const lines = wrap(v, reg, 10, W - 2 * M - 120); need(lines.length * 14 + 2); page.drawText(k, { x: M, y: y - 10, size: 9, font: bold, color: SOFT }); lines.forEach((l, i) => page.drawText(l, { x: M + 120, y: y - 10 - i * 14, size: 10, font: reg, color: INK })); y -= lines.length * 14 + 4; }
  }
  const items = Array.isArray(plan.items) ? plan.items : [];
  const pcs = items.reduce((n, i) => n + (Number(i.qty) || 0), 0);
  section('Furniture (' + pcs + (pcs === 1 ? ' piece, ' : ' pieces, ') + items.length + (items.length === 1 ? ' line)' : ' lines)'));
  const cols = [{ t: 'Qty', w: 40 }, { t: 'Product', w: 300 }, { t: 'Vendor and model', w: W - 2 * M - 340 }];
  const head = () => { need(24); let x = M; page.drawRectangle({ x: M, y: y - 18, width: W - 2 * M, height: 18, color: WASH }); for (const c of cols) { page.drawText(c.t, { x: x + 6, y: y - 13, size: 8.5, font: bold, color: SOFT }); x += c.w; } y -= 22; };
  head();
  if (!items.length) text('No products yet.', { color: SOFT });
  items.forEach((it, idx) => {
    const prod = wrap(it.name || it.series || it.code, bold, 9.5, cols[1].w - 12);
    const extra = [it.series && it.series !== it.name ? it.series : '', it.specs, it.note ? 'Note: ' + it.note : ''].filter(Boolean).join('\n');
    const det = extra ? wrap(extra, reg, 8.5, cols[1].w - 12) : [];
    const ven = wrap(it.vendor || '', reg, 9, cols[2].w - 12).concat(wrap('Model ' + (it.code || ''), bold, 9, cols[2].w - 12), wrap((it.catalog ? it.catalog + ', ' : '') + 'page ' + (it.page || '-'), reg, 8, cols[2].w - 12));
    const h = Math.max(prod.length * 12 + det.length * 11, ven.length * 11.5) + 12;
    if (y - h < 64) { newPage(); head(); }
    if (idx % 2) page.drawRectangle({ x: M, y: y - h + 4, width: W - 2 * M, height: h, color: rgb(0.985, 0.988, 0.992) });
    page.drawText(String(it.qty || 1), { x: M + 6, y: y - 12, size: 11, font: bold, color: INK });
    let yy = y - 12; prod.forEach((l) => { page.drawText(l, { x: M + 46, y: yy, size: 9.5, font: bold, color: INK }); yy -= 12; });
    det.forEach((l) => { page.drawText(l, { x: M + 46, y: yy, size: 8.5, font: reg, color: SOFT }); yy -= 11; });
    let yv = y - 12; ven.forEach((l, i) => { page.drawText(l, { x: M + 346, y: yv, size: i === ven.length - 1 ? 8 : 9, font: /^Model /.test(l) ? bold : reg, color: i === ven.length - 1 ? SOFT : INK }); yv -= 11.5; });
    y -= h; page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.5, color: LINE });
  });
  const assumptions = Array.isArray(plan.assumptions) ? plan.assumptions : [];
  if (assumptions.length) { section('Assumptions'); assumptions.forEach((a) => text('-  ' + a, { size: 9.5, gap: 4 })); }
  section('Next steps');
  ['Review the products and quantities. Change anything in the planner and download again.', 'Press "Request a priced quote" in the planner, or reply to Midwest with this plan.', 'A Midwest specialist confirms pricing, finishes, availability, lead times, delivery and installation.'].forEach((s, i) => text((i + 1) + '.  ' + s, { size: 9.5, gap: 5 }));
  y -= 8; text('Product details come from the manufacturers\' catalogues as loaded by Midwest. Anything marked unconfirmed, and any detail not listed here, is confirmed by a Midwest specialist.', { size: 8, color: SOFT });
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 44 }, end: { x: W - M, y: 44 }, thickness: 0.5, color: LINE });
    p.drawText('Midwest Educational Furnishings  >>  mwfurnishings.com', { x: M, y: 30, size: 8, font: reg, color: SOFT });
    const pg = 'Page ' + (i + 1) + ' of ' + pages.length; p.drawText(pg, { x: W - M - reg.widthOfTextAtSize(pg, 8), y: 30, size: 8, font: reg, color: SOFT });
  });
  return doc.save();
}
