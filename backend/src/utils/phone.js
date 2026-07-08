export function normalizePhone(phone = '') {
  const digits = String(phone).replace(/[^\d]/g, '');
  if (digits.length > 10 && digits.startsWith('91')) return digits.slice(-10);
  return digits;
}
