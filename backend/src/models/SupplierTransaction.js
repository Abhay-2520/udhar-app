import mongoose from 'mongoose';
import { normalizePhone } from '../utils/phone.js';

const supplierTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    phoneKey: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    date: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' },
    payments: [
      {
        amount: { type: Number, required: true, min: 0 },
        date: { type: Date, default: Date.now },
        note: { type: String, trim: true, default: '' }
      }
    ]
  },
  { timestamps: true }
);

supplierTransactionSchema.pre('validate', function setPhoneKey(next) {
  this.phoneKey = normalizePhone(this.phone);
  next();
});

supplierTransactionSchema.virtual('status').get(function getStatus() {
  return this.paidAmount >= this.amount ? 'Paid' : 'Pending';
});

supplierTransactionSchema.set('toJSON', { virtuals: true });
supplierTransactionSchema.set('toObject', { virtuals: true });

export default mongoose.model('SupplierTransaction', supplierTransactionSchema);
