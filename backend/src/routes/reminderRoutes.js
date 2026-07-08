import express from 'express';
import CustomerTransaction from '../models/CustomerTransaction.js';
import SupplierTransaction from '../models/SupplierTransaction.js';
import { reminderText, whatsappLink } from '../services/messageService.js';
import { outstanding } from '../utils/money.js';

const router = express.Router();

function dayDiff(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function classify(item) {
  const days = dayDiff(item.dueDate);
  const createdDays = Math.abs(dayDiff(item.createdAt));
  if (days < 0) return 'overdue';
  if (days === 0) return 'due_date';
  if (createdDays >= 3) return 'after_3_days';
  return null;
}

function toReminder(kind, item) {
  const trigger = classify(item);
  if (!trigger || outstanding(item) <= 0) return null;
  const message = reminderText(kind, item.name, outstanding(item));
  return {
    type: kind,
    trigger,
    name: item.name,
    phone: item.phone,
    amount: outstanding(item),
    dueDate: item.dueDate,
    message,
    whatsappUrl: whatsappLink(item.phone, message)
  };
}

router.get('/auto', async (req, res, next) => {
  try {
    const [customers, suppliers] = await Promise.all([
      CustomerTransaction.find({ user: req.user._id }),
      SupplierTransaction.find({ user: req.user._id })
    ]);

    const reminders = [
      ...customers.map((item) => toReminder('customer', item)),
      ...suppliers.map((item) => toReminder('supplier', item))
    ].filter(Boolean);

    res.json(reminders);
  } catch (error) {
    next(error);
  }
});

export default router;
