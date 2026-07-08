export function outstanding(item) {
  return Math.max(0, Number(item.amount || 0) - Number(item.paidAmount || 0));
}

export function isPaid(item) {
  return outstanding(item) === 0;
}

export function isOverdue(item) {
  return !isPaid(item) && new Date(item.dueDate) < startOfToday();
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}
