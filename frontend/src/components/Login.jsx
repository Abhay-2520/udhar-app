import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (!sent) {
        const data = await requestOtp(phone);
        setHint(data.message || 'OTP sent to your phone');
        setSent(true);
      } else {
        await verifyOtp(phone, otp);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-mark"><ShieldCheck size={24} /></div>
        <h1>Udhar Tracker App</h1>
        <p>Track customer credit, supplier dues, expenses, reminders, and cash flow from one clean workspace.</p>
        <form onSubmit={submit} className="stack">
          <label>
            Mobile number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
          </label>
          {sent && (
            <label>
              OTP
              <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" required />
            </label>
          )}
          {hint && <span className="hint">{hint}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" type="submit">
            {sent ? 'Verify and continue' : 'Send OTP'} <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
