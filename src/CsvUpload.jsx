import { useState, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// CSV / EXCEL DATA IMPORT
// Parses CSV/TSV, auto-maps columns, previews data, bulk inserts
// ═══════════════════════════════════════════════════════════════

const inputStyle = {width:"100%",padding:"8px 12px",background:"#1a1d27",border:"1px solid #2a2d37",borderRadius:6,color:"#e8e6e3",fontSize:13,outline:"none",fontFamily:"inherit"};

// Parse CSV text into array of objects
function parseCSV(text) {
  // Detect delimiter
  const firstLine = text.split('\n')[0];
  const delim = firstLine.includes('\t') ? '\t' : ',';
  
  const lines = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);
  
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const splitLine = (line) => {
    const cells = [];
    let cell = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i+1] === '"') { cell += '"'; i++; } else inQ = !inQ; }
      else if (c === delim && !inQ) { cells.push(cell.trim()); cell = ''; }
      else cell += c;
    }
    cells.push(cell.trim());
    return cells;
  };
  
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const cells = splitLine(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
    return obj;
  });
  
  return { headers, rows };
}

// Column mapping presets per data type
const COLUMN_MAPS = {
  vendors: {
    fields: ['id','name','contact','email','phone','category','address'],
    labels: ['ID (auto if blank)','Company Name','Contact Person','Email','Phone','Category','Address'],
    required: ['name'],
    guesses: { name: ['vendor','company','name','vendor name','company name'], contact: ['contact','person','rep','representative'], email: ['email','e-mail','mail'], phone: ['phone','tel','telephone'], category: ['category','type','cat'], address: ['address','addr','location','street'] },
  },
  customers: {
    fields: ['id','name','contact','email','phone','type','address'],
    labels: ['ID (auto if blank)','Organization Name','Contact Person','Email','Phone','Type','Address'],
    required: ['name'],
    guesses: { name: ['customer','client','organization','school','district','name','customer name'], contact: ['contact','person'], email: ['email','e-mail'], phone: ['phone','tel'], type: ['type','category','segment'], address: ['address','addr','location'] },
  },
  reps: {
    fields: ['id','name','email','territory','commissionRate','tier'],
    labels: ['ID (auto if blank)','Name','Email','Territory','Commission Rate (decimal)','Tier'],
    required: ['name'],
    guesses: { name: ['name','rep','salesperson','sales rep'], email: ['email'], territory: ['territory','region','area'], commissionRate: ['rate','commission','commission rate','%'], tier: ['tier','level','rank'] },
  },
  jobs: {
    fields: ['id','name','customer','salesRep','phase','createdDate','dueDate','notes','paymentStatus'],
    labels: ['ID (auto if blank)','Job Name','Customer ID','Sales Rep ID','Phase','Created Date','Due Date','Notes','Payment Status'],
    required: ['name'],
    guesses: { name: ['job','project','name','job name','project name'], customer: ['customer','client','customer id'], salesRep: ['rep','sales rep','salesperson'], phase: ['phase','status','stage'], createdDate: ['created','date','start'], dueDate: ['due','deadline','end','due date'], notes: ['notes','description','details'], paymentStatus: ['payment','paid','payment status'] },
  },
  lineItems: {
    fields: ['id','jobId','description','vendor','unitCost','unitPrice','qtyOrdered','qtyReceived','qtyInvoiced'],
    labels: ['ID (auto if blank)','Job ID','Description','Vendor ID','Unit Cost','Unit Price','Qty Ordered','Qty Received','Qty Invoiced'],
    required: ['description'],
    guesses: { jobId: ['job','job id','project'], description: ['description','item','product','name'], vendor: ['vendor','supplier','vendor id'], unitCost: ['cost','unit cost','buy price','wholesale'], unitPrice: ['price','unit price','sell price','retail'], qtyOrdered: ['ordered','qty ordered','quantity','qty'], qtyReceived: ['received','qty received','delivered'], qtyInvoiced: ['invoiced','qty invoiced','billed'] },
  },
};

function autoMapColumns(csvHeaders, targetType) {
  const map = COLUMN_MAPS[targetType];
  if (!map) return {};
  const mapping = {};
  
  map.fields.forEach(field => {
    const guesses = map.guesses[field] || [];
    const match = csvHeaders.find(h => {
      const lower = h.toLowerCase().trim();
      return guesses.some(g => lower === g || lower.includes(g));
    });
    if (match) mapping[field] = match;
  });
  
  return mapping;
}

const uid = () => Math.random().toString(36).substr(2, 9);

export default function CsvUploadPage({ vendors, customers, reps, jobs, lineItems, setVendors, setCustomers, setReps, setJobs, setLineItems, notify, db }) {
  const [step, setStep] = useState('select'); // select, map, preview, done
  const [targetType, setTargetType] = useState('vendors');
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [columnMap, setColumnMap] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const parsed = parseCSV(text);
      if (parsed.rows.length === 0) { notify('No data found in file', 'error'); return; }
      setCsvData(parsed);
      const autoMap = autoMapColumns(parsed.headers, targetType);
      setColumnMap(autoMap);
      setStep('map');
      notify(parsed.rows.length + ' rows found in ' + file.name);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    const map = COLUMN_MAPS[targetType];
    let imported = 0;
    let errors = 0;
    
    const rows = csvData.rows.map(row => {
      const obj = {};
      map.fields.forEach(field => {
        const csvCol = columnMap[field];
        if (csvCol && row[csvCol] !== undefined) {
          let val = row[csvCol];
          // Type coercion
          if (['unitCost','unitPrice','commissionRate'].includes(field)) val = parseFloat(val) || 0;
          if (['qtyOrdered','qtyReceived','qtyInvoiced'].includes(field)) val = parseInt(val) || 0;
          obj[field] = val;
        }
      });
      // Auto-generate ID if missing
      if (!obj.id || obj.id === '') {
        const prefix = { vendors: 'V-', customers: 'C-', reps: 'S-', jobs: 'JOB-', lineItems: 'LI-' }[targetType] || '';
        obj.id = prefix + uid();
      }
      return obj;
    }).filter(obj => {
      // Validate required fields
      const hasRequired = map.required.every(f => obj[f] && obj[f].toString().trim() !== '');
      if (!hasRequired) errors++;
      return hasRequired;
    });

    if (rows.length === 0) {
      notify('No valid rows to import — check required fields', 'error');
      setImporting(false);
      return;
    }

    try {
      // Batch save to Supabase (single API call instead of one per row)
      if (targetType === 'vendors') {
        await db.batchSaveVendors(rows);
        setVendors(prev => {
          const ids = new Set(prev.map(v => v.id));
          const newOnes = rows.filter(r => !ids.has(r.id));
          const updated = prev.map(v => { const match = rows.find(r => r.id === v.id); return match ? { ...v, ...match } : v; });
          return [...updated, ...newOnes];
        });
      } else if (targetType === 'customers') {
        await db.batchSaveCustomers(rows);
        setCustomers(prev => {
          const ids = new Set(prev.map(c => c.id));
          const newOnes = rows.filter(r => !ids.has(r.id));
          const updated = prev.map(c => { const match = rows.find(r => r.id === c.id); return match ? { ...c, ...match } : c; });
          return [...updated, ...newOnes];
        });
      } else if (targetType === 'reps') {
        await db.batchSaveReps(rows);
        setReps(prev => {
          const ids = new Set(prev.map(r => r.id));
          const newOnes = rows.filter(r => !ids.has(r.id));
          const updated = prev.map(r => { const match = rows.find(rr => rr.id === r.id); return match ? { ...r, ...match } : r; });
          return [...updated, ...newOnes];
        });
      } else if (targetType === 'jobs') {
        await db.batchSaveJobs(rows);
        setJobs(prev => {
          const ids = new Set(prev.map(j => j.id));
          const newOnes = rows.filter(r => !ids.has(r.id));
          const updated = prev.map(j => { const match = rows.find(r => r.id === j.id); return match ? { ...j, ...match } : j; });
          return [...updated, ...newOnes];
        });
      } else if (targetType === 'lineItems') {
        await db.batchSaveLineItems(rows);
        setLineItems(prev => {
          const ids = new Set(prev.map(l => l.id));
          const newOnes = rows.filter(r => !ids.has(r.id));
          const updated = prev.map(l => { const match = rows.find(r => r.id === l.id); return match ? { ...l, ...match } : l; });
          return [...updated, ...newOnes];
        });
      }
      imported = rows.length;
    } catch (e) {
      console.error('Import error:', e);
      errors++;
    }

    setImportResult({ imported, errors });
    setStep('done');
    setImporting(false);
    notify(imported + ' records imported to ' + targetType);
  };

  const reset = () => { setStep('select'); setCsvData({ headers: [], rows: [] }); setColumnMap({}); setImportResult(null); if (fileRef.current) fileRef.current.value = ''; };

  const cardStyle = { background: "#12141b", border: "1px solid #1e2130", borderRadius: 12, padding: 20 };
  const goldBtn = { padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: "linear-gradient(135deg,#c8a25c,#b8923c)", color: "#0a0c10" };
  const secBtn = { ...goldBtn, background: "#1e2130", color: "#e8e6e3", border: "1px solid #2a2d37" };

  return (
    <div style={{ animation: "fadeUp 0.4s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f5f5f4", marginBottom: 4, letterSpacing: -0.5 }}>Data Import</h2>
          <p style={{ fontSize: 13, color: "#6b7280" }}>Upload CSV or Excel exports to bulk-import historical data</p>
        </div>
        {step !== 'select' && <button onClick={reset} style={secBtn}>Start Over</button>}
      </div>

      {/* STEP 1: Select data type and upload file */}
      {step === 'select' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f4", marginBottom: 16 }}>Step 1: Choose data type and upload file</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
            {[['vendors','Vendors'],['customers','Customers'],['reps','Sales Reps'],['jobs','Jobs'],['lineItems','Line Items']].map(([key, label]) => (
              <button key={key} onClick={() => setTargetType(key)} style={{
                padding: "12px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                background: targetType === key ? "rgba(200,162,92,0.15)" : "#1a1d27",
                color: targetType === key ? "#c8a25c" : "#9ca3af",
                fontSize: 13, fontWeight: targetType === key ? 700 : 400, fontFamily: "inherit",
                border: targetType === key ? "1px solid #c8a25c44" : "1px solid #2a2d37",
              }}>{label}</button>
            ))}
          </div>

          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            Expected columns for <strong style={{ color: "#c8a25c" }}>{targetType}</strong>: {COLUMN_MAPS[targetType]?.labels.join(', ')}
          </div>

          <div style={{
            border: "2px dashed #2a2d37", borderRadius: 12, padding: 40, textAlign: "center",
            cursor: "pointer", transition: "border-color 0.2s",
          }} onClick={() => fileRef.current?.click()}
             onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#c8a25c"; }}
             onDragLeave={e => { e.currentTarget.style.borderColor = "#2a2d37"; }}
             onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#2a2d37"; const file = e.dataTransfer.files[0]; if (file) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; handleFile({ target: { files: [file] } }); } }}>
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>📄</div>
            <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 4 }}>Drop a CSV file here or click to browse</div>
            <div style={{ fontSize: 12, color: "#4b5563" }}>Supports .csv and .tsv files. First row must be column headers.</div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} style={{ display: "none" }} />
          </div>

          <div style={{ marginTop: 16, padding: 12, background: "#1a1d27", borderRadius: 8, fontSize: 12, color: "#6b7280" }}>
            <strong style={{ color: "#c8a25c" }}>Tip for QuickBooks data:</strong> In QuickBooks, go to Reports → export any report as CSV. Common exports: Customer Contact List, Vendor Contact List, Sales by Rep, Items list. The system will auto-detect column names and map them.
          </div>
        </div>
      )}

      {/* STEP 2: Map columns */}
      {step === 'map' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f4", marginBottom: 4 }}>Step 2: Map your columns</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>{csvData.rows.length} rows found. Map your CSV columns to the system fields below. The system auto-detected what it could.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {COLUMN_MAPS[targetType].fields.map((field, i) => (
              <div key={field} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 140, fontSize: 12, color: COLUMN_MAPS[targetType].required.includes(field) ? "#c8a25c" : "#9ca3af", fontWeight: 500 }}>
                  {COLUMN_MAPS[targetType].labels[i]} {COLUMN_MAPS[targetType].required.includes(field) && '*'}
                </div>
                <select value={columnMap[field] || ''} onChange={e => setColumnMap(prev => ({ ...prev, [field]: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                  <option value="">— skip —</option>
                  {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f4", marginBottom: 8 }}>Preview (first 5 rows)</div>
          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #1e2130" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#12141b" }}>
                  {COLUMN_MAPS[targetType].fields.filter(f => columnMap[f]).map(f => (
                    <th key={f} style={{ padding: "6px 10px", textAlign: "left", color: "#6b7280", borderBottom: "1px solid #1e2130", fontSize: 10, textTransform: "uppercase" }}>{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.rows.slice(0, 5).map((row, ri) => (
                  <tr key={ri}>
                    {COLUMN_MAPS[targetType].fields.filter(f => columnMap[f]).map(f => (
                      <td key={f} style={{ padding: "6px 10px", borderBottom: "1px solid #1a1d2720", color: "#d1d5db" }}>
                        {row[columnMap[f]] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleImport} disabled={importing} style={{ ...goldBtn, opacity: importing ? 0.6 : 1 }}>
              {importing ? 'Importing...' : 'Import ' + csvData.rows.length + ' Rows'}
            </button>
            <button onClick={() => setStep('select')} style={secBtn}>Back</button>
          </div>
        </div>
      )}

      {/* STEP 3: Done */}
      {step === 'done' && importResult && (
        <div style={cardStyle}>
          <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>
            {importResult.errors === 0 ? '✅' : '⚠️'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f5f5f4", textAlign: "center", marginBottom: 8 }}>
            Import Complete
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 20 }}>
            <strong style={{ color: "#059669" }}>{importResult.imported}</strong> records imported successfully
            {importResult.errors > 0 && <>, <strong style={{ color: "#ef4444" }}>{importResult.errors}</strong> rows skipped (missing required fields)</>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={reset} style={goldBtn}>Import More Data</button>
          </div>
        </div>
      )}

      {/* Current data counts */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f4", marginBottom: 12 }}>Current Database</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {[['Vendors', vendors.length],['Customers', customers.length],['Sales Reps', reps.length],['Jobs', jobs.length],['Line Items', lineItems.length]].map(([label, count]) => (
            <div key={label} style={{ textAlign: "center", padding: 12, background: "#1a1d27", borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#c8a25c", fontFamily: "'DM Mono', monospace" }}>{count}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
