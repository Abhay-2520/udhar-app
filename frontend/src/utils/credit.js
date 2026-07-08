export function calculateCreditScore(item = {}) {
  const amount = Number(item.amount || 0);
  const paid = Number(item.paidAmount || 0);
  const outstanding = Math.max(0, amount - paid);
  const entries = Array.isArray(item.entries) ? item.entries : [];
  const paymentEntries = entries.filter((entry) => Number(entry.paidAmount || 0) > 0).length;
  const onTimePayments = entries.filter((entry) => {
    const dueDate = entry.dueDate ? new Date(entry.dueDate) : null;
    const lastPayment = Array.isArray(entry.payments) && entry.payments.length
      ? new Date(entry.payments[entry.payments.length - 1].date)
      : null;
    return dueDate && lastPayment && lastPayment <= dueDate;
  }).length;

  let score = 35;
  if (outstanding === 0) score += 30;
  else if (outstanding < amount / 2) score += 18;

  if (entries.length) score += Math.min(20, paymentEntries * 4);
  if (onTimePayments) score += Math.min(15, onTimePayments * 3);

  return Math.min(100, Math.max(0, score));
}

export function creditLabel(score) {
  if (score >= 80) return 'Very reliable';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs attention';
  return 'High risk';
}
