import { ArrowDownRight, ArrowUpRight, IndianRupee, ReceiptText, WalletCards } from 'lucide-react';
import { currency } from '../utils/format.js';

const icons = {
  totalGiven: IndianRupee,
  totalReceived: ArrowDownRight,
  totalSupplierPending: WalletCards,
  totalExpenses: ReceiptText,
  netBalance: ArrowUpRight
};

const labels = {
  totalGiven: 'Total Given',
  totalReceived: 'Total Received',
  totalSupplierPending: 'Supplier Pending',
  totalExpenses: 'Total Expenses',
  netBalance: 'Net Balance'
};

export default function SummaryCards({ cards = {} }) {
  return (
    <section className="summary-grid">
      {Object.keys(labels).map((key) => {
        const Icon = icons[key];
        return (
          <article className={`summary-card ${key === 'netBalance' && cards[key] < 0 ? 'danger-soft' : ''}`} key={key}>
            <Icon size={20} />
            <span>{labels[key]}</span>
            <strong>{currency(cards[key])}</strong>
          </article>
        );
      })}
    </section>
  );
}
