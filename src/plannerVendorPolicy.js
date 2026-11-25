// Furniture Planner settings are separate from booking so a rep edit cannot overwrite vendor rules.
export const PLANNER_VENDOR_POLICY_ID = 'PLANNER_VENDOR_POLICY';
export const PREFERENCE_FIELDS = ['grades', 'categories', 'spaces'];

export function vendorPolicyFor(policy, vendorId) {
  return policy && Object.hasOwn(policy, vendorId) ? policy[vendorId] : null;
}

export function parseVendorPolicy(content) {
  const value = JSON.parse(content ?? '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid planner vendor settings');
  return value;
}

export function preferenceTags(value) {
  return [...new Set(String(value || '').split(',').map(tag => tag.trim().slice(0, 60)).filter(Boolean))].slice(0, 12);
}

export function referenceUrl(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (text.length > 800 || !/^https:\/\//i.test(text) || /[\s\\]/.test(text)) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function plannerWords(text) {
  return String(text ?? '').toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\b(?:pre[\s-]*k(?:indergarten)?|pre[\s-]*school|early[\s-]+childhood|ages?\s+3\s*(?:-|to|through)\s*5|3\s*(?:-|to|through)\s*5\s*(?:years?(?:\s+old)?|year-old))\b/g, 'early childhood')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export function includesPlannerWords(text, words) {
  return !!words && (' ' + text + ' ').includes(' ' + words + ' ');
}

export const categoryWords = text => plannerWords(text).replace(/\b(chair|desk|table|shelf|seat|locker|cabinet|bench|cubby)s\b/g, '$1')
  .replace(/\bbenches\b/g, 'bench').replace(/\bcubbies\b/g, 'cubby').replace(/\bshelves\b/g, 'shelf');

function matchingTag(tags, request, product, normalize = plannerWords) {
  return Array.isArray(tags) && tags.some(tag => {
    const words = normalize(tag);
    return includesPlannerWords(request, words) && includesPlannerWords(product, words);
  });
}

// The product text a preference tag is matched against (also used by the vendor research suggestions).
export const indexedProductText = row => [row.name, row.row, row.ctx, row.section, row.group, row.series].join(' ');

export function preferredProduct(rule, row, query, context, category) {
  if (!rule) return false;
  const scope = plannerWords(context + ' ' + query);
  const indexed = indexedProductText(row);
  const facts = plannerWords(indexed);
  // A matching vendor cannot make an adult or age-unknown item preferred in an early-childhood plan.
  if (includesPlannerWords(scope, 'early childhood') && !includesPlannerWords(facts, 'early childhood')) return false;
  return matchingTag(rule.grades, scope, facts)
    || matchingTag(rule.spaces, scope, facts)
    || matchingTag(rule.categories, categoryWords(query + ' ' + category), categoryWords(indexed), categoryWords);
}
