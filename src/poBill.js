// What a PO-tied vendor bill is for (Nov 2026).
// By default a bill follows what has been RECEIVED on its purchase order (unit cost x qty received),
// because vendors usually invoice on shipment. When the vendor sends separate invoices for separate
// shipments (Doane Keyes on JOB-2026-963: invoice 774758 for 19 chairs plus freight, then 774970 for
// the last chair), the office enters the amount printed on the vendor's invoice and the bill stays at
// that amount; the later shipment is billed on its own. Blank means "follow what has been received".
const round2 = (n) => Math.round(n * 100) / 100;

export function invoicedAmountOf(billData) {
  const raw = billData && typeof billData === 'object' ? billData.invoicedAmount : undefined;
  if (raw === undefined || raw === null) return null;
  const text = String(raw).replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  return isFinite(value) && value >= 0 ? round2(value) : null;
}

export function poBillAmount(items, billData) {
  const list = Array.isArray(items) ? items : [];
  const received = round2(list.reduce((s, i) => s + (Number(i && i.unitCost) || 0) * (Number(i && i.qtyReceived) || 0), 0));
  const invoiced = invoicedAmountOf(billData);
  return { cost: invoiced === null ? received : invoiced, received, invoiced };
}
