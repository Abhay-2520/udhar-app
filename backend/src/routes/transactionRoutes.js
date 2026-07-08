import express from 'express';
import CustomerTransaction from '../models/CustomerTransaction.js';
import SupplierTransaction from '../models/SupplierTransaction.js';
import { isOverdue, outstanding } from '../utils/money.js';
import { normalizePhone } from '../utils/phone.js';
import { reminderText, sendSms, whatsappLink } from '../services/messageService.js';

export function createTransactionRouter(kind) {
  const router = express.Router();
  const Model = kind === 'supplier' ? SupplierTransaction : CustomerTransaction;

  function enrich(item) {
    return { ...item.toJSON(), outstanding: outstanding(item), overdue: isOverdue(item) };
  }

  function groupByPhone(items) {
    const groups = new Map();

    for (const item of items) {
      const enriched = enrich(item);
      const phoneKey = item.phoneKey || normalizePhone(item.phone);
      const current = groups.get(phoneKey) || {
        _id: `phone-${phoneKey}`,
        phoneKey,
        grouped: true,
        name: enriched.name,
        phone: enriched.phone,
        amount: 0,
        paidAmount: 0,
        outstanding: 0,
        overdue: false,
        dueDate: enriched.dueDate,
        date: enriched.date,
        entries: []
      };

      current.amount += Number(enriched.amount || 0);
      current.paidAmount += Number(enriched.paidAmount || 0);
      current.outstanding += Number(enriched.outstanding || 0);
      current.overdue = current.overdue || enriched.overdue;
      current.entries.push(enriched);

      if (new Date(enriched.date) > new Date(current.date)) {
        current.name = enriched.name;
        current.phone = enriched.phone;
        current.date = enriched.date;
      }

      const currentDue = new Date(current.dueDate);
      const itemDue = new Date(enriched.dueDate);
      if (enriched.outstanding > 0 && itemDue < currentDue) current.dueDate = enriched.dueDate;

      groups.set(phoneKey, current);
    }

    return [...groups.values()].map((group) => ({
      ...group,
      status: group.outstanding <= 0 ? 'Paid' : 'Pending',
      entries: group.entries.sort((a, b) => new Date(b.date) - new Date(a.date))
    }));
  }

  router.get('/', async (req, res, next) => {
    try {
      const { search, status, from, to } = req.query;
      const query = { user: req.user._id };
      if (search) query.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];
      if (from || to) query.date = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };

      const items = await Model.find(query).sort({ date: -1, createdAt: -1 });
      const groups = groupByPhone(items);
      const filtered = status ? groups.filter((item) => item.status === status) : groups;
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const paidAmount = Math.min(Number(req.body.amount || 0), Number(req.body.paidAmount || 0));
      const item = await Model.create({
        ...req.body,
        user: req.user._id,
        paidAmount,
        payments: paidAmount > 0
          ? [{ amount: paidAmount, date: req.body.date || new Date(), note: req.body.paymentNote || 'Opening payment' }]
          : []
      });
      res.status(201).json({ ...item.toJSON(), outstanding: outstanding(item), overdue: isOverdue(item) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/history/:phone', async (req, res, next) => {
    try {
      const phoneKey = normalizePhone(req.params.phone);
      const allItems = await Model.find({ user: req.user._id }).sort({ date: -1, createdAt: -1 });
      const matched = allItems.filter((item) => (item.phoneKey || normalizePhone(item.phone)) === phoneKey);
      const enriched = matched.map(enrich);

      res.json({
        phoneKey,
        count: enriched.length,
        totalAmount: enriched.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        totalPaid: enriched.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
        totalOutstanding: enriched.reduce((sum, item) => sum + Number(item.outstanding || 0), 0),
        items: enriched
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const item = await Model.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
      if (!item) return res.status(404).json({ message: 'Transaction not found' });
      res.json({ ...item.toJSON(), outstanding: outstanding(item), overdue: isOverdue(item) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/phone/:phone/payments', async (req, res, next) => {
    try {
      let remaining = Number(req.body.amount || 0);
      if (remaining <= 0) return res.status(400).json({ message: 'Payment amount must be greater than zero' });

      const phoneKey = normalizePhone(req.params.phone);
      const items = await Model.find({ user: req.user._id }).sort({ date: 1, createdAt: 1 });
      const matched = items.filter((item) => (item.phoneKey || normalizePhone(item.phone)) === phoneKey && outstanding(item) > 0);

      if (!matched.length) return res.status(404).json({ message: 'No pending transaction found for this phone number' });

      for (const item of matched) {
        if (remaining <= 0) break;
        const applied = Math.min(outstanding(item), remaining);
        item.payments.push({ amount: applied, date: req.body.date || new Date(), note: req.body.note || 'Group payment' });
        item.paidAmount = Math.min(Number(item.amount), Number(item.paidAmount || 0) + applied);
        remaining -= applied;
        await item.save();
      }

      const updated = await Model.find({ user: req.user._id }).sort({ date: -1, createdAt: -1 });
      const group = groupByPhone(updated).find((item) => item.phoneKey === phoneKey);
      res.json({ ...group, unappliedAmount: remaining });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/payments', async (req, res, next) => {
    try {
      const amount = Number(req.body.amount || 0);
      if (amount <= 0) return res.status(400).json({ message: 'Payment amount must be greater than zero' });

      const item = await Model.findOne({ _id: req.params.id, user: req.user._id });
      if (!item) return res.status(404).json({ message: 'Transaction not found' });
      item.payments.push({ amount, date: req.body.date || new Date(), note: req.body.note || '' });
      item.paidAmount = Math.min(Number(item.amount), Number(item.paidAmount || 0) + amount);
      await item.save();
      res.json({ ...item.toJSON(), outstanding: outstanding(item), overdue: isOverdue(item) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/phone/:phone/reminder', async (req, res, next) => {
    try {
      const phoneKey = normalizePhone(req.params.phone);
      const items = await Model.find({ user: req.user._id }).sort({ date: -1, createdAt: -1 });
      const group = groupByPhone(items).find((item) => item.phoneKey === phoneKey);
      if (!group) return res.status(404).json({ message: 'Record not found for this phone number' });

      const message = reminderText(kind, group.name, group.outstanding);
      const sms = req.body.channel === 'sms' ? await sendSms(group.phone, message) : null;
      res.json({ message, whatsappUrl: whatsappLink(group.phone, message), sms });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/reminder', async (req, res, next) => {
    try {
      const item = await Model.findOne({ _id: req.params.id, user: req.user._id });
      if (!item) return res.status(404).json({ message: 'Transaction not found' });
      const amount = outstanding(item);
      const message = reminderText(kind, item.name, amount);
      const sms = req.body.channel === 'sms' ? await sendSms(item.phone, message) : null;
      res.json({ message, whatsappUrl: whatsappLink(item.phone, message), sms });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
