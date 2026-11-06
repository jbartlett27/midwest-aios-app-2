#!/usr/bin/env python3
"""Turn a vendor catalogue PDF into the JSON the Midwest AIOS reads (vendor page and Brain).

Usage:  extract_vendor_catalog.py <catalogue.pdf> <config.json> <out.json>

Needs `pdftotext` (poppler) on PATH and Python 3. Standard library only.
The config names the vendor, the table of contents (the PDF's own section list), and the
pages that carry no products. See tools/vendor-catalogs/wb-mfg-2026.config.json.
Output format (v1) is read by src/vendorCatalog.js.
"""
import json
import re
import subprocess
import sys
import datetime

# A model code is letters then a digit, optionally followed by dash groups (EONP401-EJA, SS5000-3660-5AC).
# A code that follows a dash, slash or dot is an option suffix, not a model, so it is not matched here.
CODE_RE = re.compile(r'(?<![A-Za-z0-9\-/.])([A-Z]{1,6}\d[A-Z0-9]*(?:-[A-Z0-9]{1,14}){0,5})(?![A-Za-z0-9])')
NOT_CODE_RE = re.compile(r'^(ISO|ANSI|BIFMA|ASTM|TSCA|CARB|AWI|NSF|CAL|UL)\d')
HEADER_RE = re.compile(r'Model\b|\bWgt\b|Top Shape|D" x L"|W" x H"|\bDescription\b|\bPart #')
INDEX_RE = re.compile(r'(\d+)\.{3,}\s*(.+?)(?=\s*\|\s*\d+\.{3,}|$)')


def find_codes(line):
    return [c for c in CODE_RE.findall(line) if len(c) >= 4 and not NOT_CODE_RE.match(c)]


def read_pages(pdf):
    out = subprocess.run(['pdftotext', '-layout', pdf, '-'], stdout=subprocess.PIPE,
                         stderr=subprocess.DEVNULL, check=True).stdout.decode('utf8', 'replace')
    pages = out.split('\f')
    if pages and not pages[-1].strip():
        pages.pop()
    return pages


def norm_lines(text, cfg):
    prefixes = tuple(cfg.get('boilerplatePrefixes', []))
    foot = re.compile(cfg['footerPageRegex']) if cfg.get('footerPageRegex') else None
    lines, pn = [], None
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        s = re.sub(r'\s{2,}', ' | ', s)
        if foot:
            m = foot.search(s)
            if m:
                pn = int(m.group(1))
        if prefixes and s.startswith(prefixes):
            continue
        lines.append(s)
    return lines, pn


def build(pdf, cfg):
    raw = read_pages(pdf)
    offset = cfg.get('pageOffset', 0)
    secs = []
    for e in cfg['sections']:
        pdf_page = e['pdf'] if 'pdf' in e else e['printed'] + offset
        secs.append({'group': e['group'], 'title': e['title'], 'page': pdf_page, 'products': e.get('products', True)})
    secs.sort(key=lambda s: s['page'])
    merged = []
    for s in secs:
        if merged and merged[-1]['page'] == s['page']:
            merged[-1]['title'] += ' / ' + s['title']
        else:
            merged.append(dict(s))
    for i, s in enumerate(merged):
        s['id'] = 's%d' % (i + 1)
        s['end'] = (merged[i + 1]['page'] - 1) if i + 1 < len(merged) else len(raw)

    def section_of(n):
        cur = None
        for s in merged:
            if s['page'] <= n:
                cur = s
        return cur

    max_text = cfg.get('maxPageChars', 24000)
    pages, products, headers, hdr_ix, index = [], [], [], {}, []
    seen = set()
    for n, text in enumerate(raw, 1):
        lines, pn = norm_lines(text, cfg)
        sec = section_of(n)
        body = '\n'.join(lines)
        trunc = len(body) > max_text
        if trunc:
            body = body[:max_text]
        pages.append({'n': n, 'pn': pn, 'sec': sec['id'] if sec else None,
                      'title': lines[0] if lines else '', 'text': body, **({'trunc': True} if trunc else {})})
        if n in cfg.get('indexPages', []):
            for ln in lines:
                for m in INDEX_RE.finditer(ln):
                    index.append({'name': m.group(2).strip(' .|'), 'pn': int(m.group(1)), 'p': int(m.group(1)) + offset})
        if not (sec and sec['products']):
            continue
        title = lines[0] if lines else ''
        for i, ln in enumerate(lines):
            codes = find_codes(ln)
            if not codes:
                continue
            hdr = -1
            for j in range(i - 1, max(-1, i - 16), -1):
                if HEADER_RE.search(lines[j]):
                    h = lines[j][:170]
                    hdr = hdr_ix.setdefault(h, len(hdr_ix))
                    if hdr == len(headers):
                        headers.append(h)
                    break
            ctx = []
            for j in range(i + 1, min(len(lines), i + 3)):
                if find_codes(lines[j]):
                    break
                ctx.append(lines[j][:200])
            # The product name is usually the line above its row (Adapt XL, then its sizes and models).
            before = ''
            if i > 0 and len(lines[i - 1]) <= 120 and not find_codes(lines[i - 1]) and not HEADER_RE.search(lines[i - 1]):
                before = lines[i - 1]
            row = ln[:320]
            for c in dict.fromkeys(codes):
                key = (c, n, row[:90])
                if key in seen:
                    continue
                seen.add(key)
                rec = {'c': c, 'p': n, 'r': row}
                if before:
                    rec['b'] = before
                if ctx:
                    rec['x'] = ' / '.join(ctx)
                if hdr >= 0:
                    rec['h'] = hdr
                products.append(rec)
    return {
        'v': 1,
        'vendorId': cfg['vendorId'], 'vendorName': cfg['vendorName'],
        'title': cfg['title'], 'edition': cfg['edition'], 'source': cfg.get('source', ''),
        'hasPrices': bool(cfg.get('hasPrices', False)),
        'pageOffset': offset, 'pageCount': len(raw),
        'company': cfg.get('company', {}), 'profilePages': cfg.get('profilePages', []),
        'notes': cfg.get('notes', []),
        'sections': merged, 'pages': pages, 'headers': headers, 'products': products, 'index': index,
        'generatedAt': datetime.date.today().isoformat(),
    }


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    pdf, cfg_path, out = sys.argv[1:4]
    with open(cfg_path, encoding='utf8') as f:
        cfg = json.load(f)
    data = build(pdf, cfg)
    with open(out, 'w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    uniq = {p['c'] for p in data['products']}
    print('pages', data['pageCount'], 'sections', len(data['sections']), 'rows', len(data['products']),
          'unique codes', len(uniq), 'headers', len(data['headers']), 'index entries', len(data['index']))


if __name__ == '__main__':
    main()
