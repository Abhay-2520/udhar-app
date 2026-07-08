import express from 'express';
import Expense from '../models/Expense.js';

const router = express.Router();

router.delete('/reset', async (req, res, next) => {
  try {
    await Expense.deleteMany({ user: req.user._id });
    res.json({ message: 'Expenses reset' });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { search, category, from, to } = req.query;
    const query = { user: req.user._id };
    if (search) query.title = new RegExp(search, 'i');
    if (category) query.category = category;
    if (from || to) query.date = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, user: req.user._id });
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (error) {
    next(error);
  }
});

export default router;
