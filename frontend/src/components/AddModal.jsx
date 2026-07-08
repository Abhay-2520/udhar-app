import { X } from 'lucide-react';
import { useState } from 'react';
import { todayInput } from '../utils/format.js';

export default function AddModal({ type, onClose, onSubmit }) {
  const [error, setError] = useState('');
  if (!type) return null;
  const isExpense = type === 'expense';

  async function submit(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.amount = Number(payload.amount);
    if ('paidAmount' in payload) payload.paidAmount = Number(payload.paidAmount || 0);
    try {
      await onSubmit(type, payload);
    } catch (err) {
      setError(err.message || 'Unable to save record');
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-head">
          <h2>{isExpense ? 'Add Expense' : type === 'customer' ? 'Add Customer Udhar' : 'Add Supplier Udhar'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          {isExpense ? (
            <>
              <label>Title<input name="title" placeholder="Rent, Electricity, Food" required /></label>
              <label>Category<select name="category" defaultValue="Others"><option>Rent</option><option>Food</option><option>Travel</option><option>Bills</option><option>Others</option></select></label>
            </>
          ) : (
            <>
              <label>Name<input name="name" placeholder="Rahul Sharma" required /></label>
              <label>Phone<input name="phone" placeholder="+91 98765 43210" required /></label>
            </>
          )}
          <label>Amount<input name="amount" type="number" min="0" placeholder="500" required /></label>
          {!isExpense && <label>Paid amount<input name="paidAmount" type="number" min="0" placeholder="0" /></label>}
          <label>Date<input name="date" type="date" defaultValue={todayInput()} required /></label>
          {!isExpense && <label>Due date<input name="dueDate" type="date" defaultValue={todayInput()} required /></label>}
          <label className="wide">Notes<input name="notes" placeholder="Optional" /></label>
          {error && <span className="error wide">{error}</span>}
          <button className="primary wide" type="submit">Save</button>
        </form>
      </section>
    </div>
  );
}
