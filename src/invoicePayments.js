export function invoiceCheckoutPayload(doc) {
  const amount = Math.round(Number(doc?.data?.total) * 100);
  const invoiceNum = doc?.data?.invoiceNum;
  if (doc?.type !== 'invoice' || !invoiceNum || !Number.isSafeInteger(amount) || amount <= 0) return null;
  return { action:'create_checkout', job_name:doc.job?.name || '', customer_name:doc.data.customer?.name || '', customer_email:doc.data.customer?.email || '', amount_cents:amount, job_id:doc.job?.id, invoice_id:invoiceNum };
}
export function matchingInvoicePaymentLink(doc, session) {
  const payload = invoiceCheckoutPayload(doc);
  return payload && session?.url && Math.round(Number(session.amount) * 100) === payload.amount_cents ? session.url : '';
}
