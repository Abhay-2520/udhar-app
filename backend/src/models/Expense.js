import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['Rent', 'Food', 'Travel', 'Bills', 'Others'],
      default: 'Others'
    },
    date: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
