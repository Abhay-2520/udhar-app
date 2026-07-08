import { Moon, Palette, Plus, Search, Sun, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from './api/client.js';
import AddModal from './components/AddModal.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import Login from './components/Login.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import Timeline from './components/Timeline.jsx';
import TransactionList from './components/TransactionList.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { currency } from './utils/format.js';

const themeOptions = [
  { key: 'teal', label: 'Teal', colors: { primary: '#0f766e', primaryStrong: '#115e59', danger: '#dc2626', amber: '#b45309' } },
  { key: 'blue', label: 'Blue', colors: { primary: '#2563eb', primaryStrong: '#1d4ed8', danger: '#dc2626', amber: '#b45309' } },
  { key: 'violet', label: 'Violet', colors: { primary: '#7c3aed', primaryStrong: '#6d28d9', danger: '#dc2626', amber: '#b45309' } },
  { key: 'rose', label: 'Rose', colors: { primary: '#e11d48', primaryStrong: '#be123c', danger: '#dc2626', amber: '#b45309' } }
];

function AppShell() {
  const { token, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem('udhar_theme_mode') === 'dark');
  const [theme, setTheme] = useState(() => localStorage.getItem('udhar_theme_palette') || 'teal');
  const [tab, setTab] = useState('dashboard');
  const [addOpen, setAddOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState({ customers: [], suppliers: [], expenses: [], feed: [], dashboard: null, monthly: null, reminders: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    const selectedTheme = themeOptions.find((item) => item.key === theme) || themeOptions[0];
    const palette = selectedTheme.colors;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.setProperty('--bg', dark ? '#111315' : '#f6f7f9');
    document.documentElement.style.setProperty('--panel', dark ? '#1a1f22' : '#ffffff');
    document.documentElement.style.setProperty('--line', dark ? '#30383d' : '#dbe2e8');
    document.documentElement.style.setProperty('--text', dark ? '#f2f5f6' : '#172026');
    document.documentElement.style.setProperty('--muted', dark ? '#9aa7af' : '#6c7a86');
    document.documentElement.style.setProperty('--primary', palette.primary);
    document.documentElement.style.setProperty('--primary-strong', palette.primaryStrong);
    document.documentElement.style.setProperty('--danger', '#dc2626');
    document.documentElement.style.setProperty('--amber', palette.amber);
    localStorage.setItem('udhar_theme_mode', dark ? 'dark' : 'light');
    localStorage.setItem('udhar_theme_palette', theme);
  }, [dark, theme]);

  async function load() {
    if (!token) return;
    setError('');
    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      if (status) params.set('status', status);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const expenseParams = new URLSearchParams();
      if (query) expenseParams.set('search', query);
      if (category) expenseParams.set('category', category);
      if (fromDate) expenseParams.set('from', fromDate);
      if (toDate) expenseParams.set('to', toDate);

      const [customers, suppliers, expenses, feed, dashboard, monthly, reminders] = await Promise.all([
        api(`/customers?${params}`),
        api(`/suppliers?${params}`),
        api(`/expenses?${expenseParams}`),
        api('/timeline'),
        api('/dashboard'),
        api('/analytics/monthly'),
        api('/reminders/auto')
      ]);
      setData({ customers, suppliers, expenses, feed, dashboard, monthly, reminders });
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [token, query, status, category, fromDate, toDate]);

  async function create(type, payload) {
    const path = type === 'expense' ? '/expenses' : `/${type}s`;
    await api(path, { method: 'POST', body: payload });
    setModal(null);
    await load();
  }

  async function clearFilters() {
    setQuery('');
    setStatus('');
    setCategory('');
    setFromDate('');
    setToDate('');
  }

  async function resetData() {
    if (!window.confirm('Reset all transactions and expenses for this account?')) return;
    try {
      await api('/reset', { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const monthlyBars = useMemo(() => {
    const income = data.monthly?.income || 0;
    const expense = data.monthly?.expense || 0;
    const max = Math.max(income, expense, 1);
    return { income: (income / max) * 100, expense: (expense / max) * 100 };
  }, [data.monthly]);

  const searchMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const options = [
      ...data.customers.map((item) => ({ ...item, type: 'customer' })),
      ...data.suppliers.map((item) => ({ ...item, type: 'supplier' }))
    ];
    return options.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const phone = String(item.phone || '').toLowerCase();
      return name.includes(normalized) || phone.includes(normalized);
    });
  }, [data.customers, data.suppliers, query]);

  if (!token) return <Login />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Udhar Tracker</span>
          <h1>Business Ledger</h1>
        </div>
        <div className="top-actions">
          <div className="theme-picker" aria-label="Color theme chooser">
            {themeOptions.map((option) => (
              <button key={option.key} className={`theme-chip ${theme === option.key ? 'active' : ''}`} onClick={() => setTheme(option.key)}>
                <span style={{ background: option.colors.primary }} />
                {option.label}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tabs">
        {['dashboard', 'customers', 'suppliers', 'expenses', 'timeline'].map((item) => (
          <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>
        ))}
      </nav>

      <section className="filters">
        <label className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, number, expense" /></label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All status</option><option>Pending</option><option>Paid</option></select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option><option>Rent</option><option>Food</option><option>Travel</option><option>Bills</option><option>Others</option></select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <div className="filter-actions">
          <button className="ghost" onClick={clearFilters}>Reset filters</button>
          <button className="ghost" onClick={resetData}>Reset data</button>
        </div>
      </section>

      {error && <p className="error banner">{error}</p>}

      {tab === 'dashboard' && (
        <>
          <SummaryCards cards={data.dashboard?.cards} />
          {query && (
            <section className="panel">
              <div className="section-head"><h2>Search results</h2><span>{searchMatches.length} matches</span></div>
              <div className="mini-list">
                {searchMatches.length ? searchMatches.map((item) => (
                  <span key={`${item.type}-${item.phone}`}>{item.type === 'customer' ? 'Customer' : 'Supplier'} · {item.name} · {item.phone} · {currency(item.outstanding)}</span>
                )) : <span>No matching customers or suppliers.</span>}
              </div>
            </section>
          )}
          <section className="analytics-grid">
            <article className="panel">
              <div className="section-head"><h2>Monthly Analytics</h2><span>{currency(data.monthly?.profitLoss)} P/L</span></div>
              <div className="bar-row"><span>Income</span><div><i style={{ width: `${monthlyBars.income}%` }} /></div><strong>{currency(data.monthly?.income)}</strong></div>
              <div className="bar-row expense"><span>Expense</span><div><i style={{ width: `${monthlyBars.expense}%` }} /></div><strong>{currency(data.monthly?.expense)}</strong></div>
            </article>
            <article className="panel">
              <div className="section-head"><h2>Smart Insights</h2><span>Overdues</span></div>
              <p className="metric-line">Customer overdue: <strong>{data.dashboard?.smart?.overdueCustomers || 0}</strong></p>
              <p className="metric-line">Supplier overdue: <strong>{data.dashboard?.smart?.overdueSuppliers || 0}</strong></p>
              <p className="metric-line">Customers fully paid: <strong>{data.dashboard?.smart?.fullyPaidCustomers || 0}</strong></p>
              <p className="metric-line">Customers pending: <strong>{data.dashboard?.smart?.pendingCustomers || 0}</strong></p>
              <p className="metric-line">Suppliers fully paid: <strong>{data.dashboard?.smart?.fullyPaidSuppliers || 0}</strong></p>
              <p className="metric-line">Suppliers pending: <strong>{data.dashboard?.smart?.pendingSuppliers || 0}</strong></p>
              <div className="mini-list">
                {(data.dashboard?.smart?.topBorrowers || []).map((item) => <span key={item.phone}>Top borrower: {item.name} · {currency(item.amount)}</span>)}
                {(data.dashboard?.smart?.topSuppliers || []).map((item) => <span key={item.phone}>Top supplier: {item.name} · {currency(item.amount)}</span>)}
              </div>
            </article>
          </section>
          <section className="panel">
            <div className="section-head"><h2>Reminder Queue</h2><span>{data.reminders.length} alerts</span></div>
            <div className="mini-list">
              {data.reminders.slice(0, 6).map((item) => (
                <a className="reminder-link" href={item.whatsappUrl} target="_blank" rel="noreferrer" key={`${item.type}-${item.phone}-${item.trigger}`}>
                  {item.trigger.replaceAll('_', ' ')} · {item.name} · {currency(item.amount)}
                </a>
              ))}
              {!data.reminders.length && <span>No automatic reminders due right now.</span>}
            </div>
          </section>
        </>
      )}

      {tab === 'customers' && <TransactionList title="Customer Udhar" type="customer" items={data.customers} onChanged={load} />}
      {tab === 'suppliers' && <TransactionList title="Supplier Udhar" type="supplier" items={data.suppliers} onChanged={load} />}
      {tab === 'expenses' && <ExpenseList items={data.expenses} />}
      {tab === 'timeline' && <Timeline feed={data.feed} />}

      <div className="fab-wrap">
        {addOpen && (
          <div className="fab-menu">
            <button onClick={() => { setModal('customer'); setAddOpen(false); }}>Add Customer Udhar</button>
            <button onClick={() => { setModal('supplier'); setAddOpen(false); }}>Add Supplier Udhar</button>
            <button onClick={() => { setModal('expense'); setAddOpen(false); }}>Add Expense</button>
          </div>
        )}
        <button className="fab" onClick={() => setAddOpen((value) => !value)} aria-label="Add">
          {addOpen ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>

      <AddModal type={modal} onClose={() => setModal(null)} onSubmit={create} />
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
