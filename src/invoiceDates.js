import { isBusinessDate, businessDayAfter } from './businessDate.js';

export function invoiceTermsDays(terms) {
  const value = String(terms || 'Net 30');
  return value.includes('15') ? 15 : value.includes('Receipt') ? 0 : 30;
}
// Issued numbers own their dates. Only the first invoice may inherit legacy base keys.
export function resolveInvoiceDates({ invoiceNum, docNum, record, draftDate }, statuses, terms, today) {
  const key = invoiceNum || docNum;
  const saved = record || {};
  const ownDate = statuses?.[key + '__date'];
  const ownDue = statuses?.[key + '__due'];
  const date = [draftDate, ownDate, saved.date, today].find(isBusinessDate) || '';
  const dueDate = [ownDue, saved.dueDate].find(isBusinessDate) || businessDayAfter(date, invoiceTermsDays(terms));
  return { date, dueDate };
}
