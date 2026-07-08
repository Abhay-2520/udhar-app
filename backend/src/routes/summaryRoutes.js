import express from 'express';
import CustomerTransaction from '../models/CustomerTransaction.js';
import Expense from '../models/Expense.js';
import SupplierTransaction from '../models/SupplierTransaction.js';
import { isOverdue, outstanding } from '../utils/money.js';

const router = express.Router();

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

router.delete('/reset', async (req, res, next) => {
  try {
    await Promise.all([
      CustomerTransaction.deleteMany({ user: req.user._id }),
      SupplierTransaction.deleteMany({ user: req.user._id }),
      Expense.deleteMany({ user: req.user._id })
    ]);
    res.json({ message: 'All records reset' });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const [customers, suppliers, expenses] = await Promise.all([
      CustomerTransaction.find({ user: req.user._id }),
      SupplierTransaction.find({ user: req.user._id }),
      Expense.find({ user: req.user._id })
    ]);

    const totalGiven = customers.reduce((sum, item) => sum + item.amount, 0);
    const totalReceived = customers.reduce((sum, item) => sum + item.paidAmount, 0);
    const supplierPending = suppliers.reduce((sum, item) => sum + outstanding(item), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const fullyPaidCustomers = customers.filter((item) => outstanding(item) === 0).length;
    const pendingCustomers = customers.filter((item) => outstanding(item) > 0).length;
    const fullyPaidSuppliers = suppliers.filter((item) => outstanding(item) === 0).length;
    const pendingSuppliers = suppliers.filter((item) => outstanding(item) > 0).length;

    const topBorrowers = [...customers]
      .sort((a, b) => outstanding(b) - outstanding(a))
      .slice(0, 5)
      .map((item) => ({ name: item.name, phone: item.phone, amount: outstanding(item) }));
    const topSuppliers = [...suppliers]
      .sort((a, b) => outstanding(b) - outstanding(a))
      .slice(0, 5)
      .map((item) => ({ name: item.name, phone: item.phone, amount: outstanding(item) }));

    res.json({
      cards: {
        totalGiven,
        totalReceived,
        totalSupplierPending: supplierPending,
        totalExpenses,
        netBalance: totalReceived - totalExpenses - supplierPending
      },
      smart: {
        overdueCustomers: customers.filter(isOverdue).length,
        overdueSuppliers: suppliers.filter(isOverdue).length,
        fullyPaidCustomers,
        pendingCustomers,
        fullyPaidSuppliers,
        pendingSuppliers,
        topBorrowers,
        topSuppliers
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/timeline', async (req, res, next) => {
  try {
    const { type } = req.query;
    const [customers, suppliers, expenses] = await Promise.all([
      type && type !== 'customers' ? [] : CustomerTransaction.find({ user: req.user._id }),
      type && type !== 'suppliers' ? [] : SupplierTransaction.find({ user: req.user._id }),
      type && type !== 'expenses' ? [] : Expense.find({ user: req.user._id })
    ]);

    const feed = [
      ...customers.map((item) => ({ type: 'customer', date: item.date, title: item.name, amount: item.amount, status: item.status, overdue: isOverdue(item) })),
      ...suppliers.map((item) => ({ type: 'supplier', date: item.date, title: item.name, amount: item.amount, status: item.status, overdue: isOverdue(item) })),
      ...expenses.map((item) => ({ type: 'expense', date: item.date, title: item.title, amount: item.amount, category: item.category }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(feed);
  } catch (error) {
    next(error);
  }
});

router.get('/analytics/monthly', async (req, res, next) => {
  try {
    const start = monthStart();
    const [customers, expenses] = await Promise.all([
      CustomerTransaction.find({ user: req.user._id, date: { $gte: start } }),
      Expense.find({ user: req.user._id, date: { $gte: start } })
    ]);

    const income = customers.reduce((sum, item) => sum + item.paidAmount, 0);
    const expense = expenses.reduce((sum, item) => sum + item.amount, 0);
    res.json({ income, expense, profitLoss: income - expense });
  } catch (error) {
    next(error);
  }
});

export default router;
