import { History, MessageCircle, Phone, Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client.js';
import { currency, dateTime, dueInDays, shortDate } from '../utils/format.js';
import { calculateCreditScore, creditLabel } from '../utils/credit.js';

export default function TransactionList({ title, type, items, onChanged }) {
  const [paying, setPaying] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [historyFor, setHistoryFor] = useState('');
  const [history, setHistory] = useState(null);

  async function addPayment(item) {
    const path = item.grouped
      ? `/${type}s/phone/${encodeURIComponent(item.phone)}/payments`
      : `/${type}s/${item._id}/payments`;
    await api(path, { method: 'POST', body: { amount: Number(amount), note: paymentNote } });
    setPaying('');
    setAmount('');
    setPaymentNote('');
    await onChanged();
    await loadHistory(item, true);
  }

  async function remind(item, channel = 'whatsapp') {
    const path = item.grouped
      ? `/${type}s/phone/${encodeURIComponent(item.phone)}/reminder`
      : `/${type}s/${item._id}/reminder`;
    const data = await api(path, { method: 'POST', body: { channel } });
    if (channel === 'whatsapp') window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
    else alert(data.sms?.message || 'SMS request sent');
  }

  async function loadHistory(item, forceOpen = false) {
    if (!forceOpen && historyFor === item._id) {
      setHistoryFor('');
      setHistory(null);
      return;
    }

    const data = await api(`/${type}s/history/${encodeURIComponent(item.phone)}`);
    setHistoryFor(item._id);
    setHistory(data);
  }

  return (
    <section className="panel">
      <div className="section-head">
        <h2>{title}</h2>
        <span>{items.length} people</span>
      </div>
      <div className="list">
        {items.map((item) => {
          const progress = Math.min(100, Math.round((Number(item.paidAmount || 0) / Number(item.amount || 1)) * 100));
          const dueDays = dueInDays(item.dueDate);
          const visibleHistory = historyFor === item._id ? history : null;
          const entries = visibleHistory?.items || [];
          const status = item.status || (Number(item.outstanding || 0) <= 0 ? 'Paid' : 'Pending');
          const score = calculateCreditScore({ ...item, entries: item.entries || [] });
          const scoreText = creditLabel(score);

          return (
            <article className={`entry ${item.overdue ? 'overdue' : ''}`} key={item._id}>
              <button className="entry-click" onClick={() => loadHistory(item)} type="button">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.phone} - {item.entries?.length || 1} entries - Due {shortDate(item.dueDate)}</p>
                </div>
                <div className="amount-stack">
                  <span className={`status-pill ${status === 'Paid' ? 'paid' : item.overdue ? 'danger' : 'pending'}`}>{status}</span>
                  <strong>{currency(item.outstanding)}</strong>
                </div>
              </button>

              <div className="progress"><span style={{ width: `${progress}%` }} /></div>

              <div className="entry-meta">
                <span>Total: {currency(item.amount)}</span>
                <span>Paid: {currency(item.paidAmount)}</span>
                <span>{item.overdue ? `${Math.abs(dueDays)} days overdue` : `${dueDays} days left`}</span>
                <span>Credit: {score} ({scoreText})</span>
              </div>

              {paying === item._id ? (
                <div className="payment-form">
                  <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" placeholder="Payment amount" />
                  <textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Payment note, reason, UPI ref, cash details..." />
                  <div className="payment-actions">
                    <button onClick={() => addPayment(item)} type="button">Save payment</button>
                    <button onClick={() => { setPaying(''); setPaymentNote(''); setAmount(''); }} type="button">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="actions">
                  <button onClick={() => setPaying(item._id)}><Plus size={16} /> Payment</button>
                  <button onClick={() => loadHistory(item)}><History size={16} /> {historyFor === item._id ? 'Hide' : 'History'}</button>
                  <button onClick={() => remind(item)}><MessageCircle size={16} /> WhatsApp</button>
                  <button onClick={() => remind(item, 'sms')}><Phone size={16} /> SMS</button>
                </div>
              )}

              {visibleHistory && (
                <div className="history-box">
                  <div className="history-summary">
                    <span>Total: {currency(visibleHistory.totalAmount)}</span>
                    <span>Paid: {currency(visibleHistory.totalPaid)}</span>
                    <span>Pending: {currency(visibleHistory.totalOutstanding)}</span>
                  </div>

                  {entries.map((record) => (
                    <div className="history-entry" key={record._id}>
                      <div className="history-entry-head">
                        <strong>{shortDate(record.date)}</strong>
                        <span>Udhar {currency(record.amount)}</span>
                        <span>Paid {currency(record.paidAmount)}</span>
                        <span>Pending {currency(record.outstanding)}</span>
                      </div>
                      <p>{record.notes || 'Udhar entry'}</p>

                      <div className="payment-history">
                        <span className="payment-title">Payment history</span>
                        {record.payments?.length ? (
                          record.payments.map((payment) => (
                            <div className="payment-history-row" key={payment._id || `${payment.date}-${payment.amount}`}>
                              <span>{dateTime(payment.date)}</span>
                              <strong>{currency(payment.amount)}</strong>
                              <span>{payment.note || 'No note'}</span>
                            </div>
                          ))
                        ) : (
                          <span className="muted-text">No payment yet</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
        {!items.length && <p className="empty">No records found.</p>}
      </div>
    </section>
  );
}
