import { currency, shortDate } from '../utils/format.js';

export default function ExpenseList({ items }) {
  return (
    <section className="panel">
      <div className="section-head">
        <h2>Expenses Timeline</h2>
        <span>{items.length} records</span>
      </div>
      <div className="list">
        {items.map((item) => (
          <article className="entry compact" key={item._id}>
            <div className="entry-main">
              <div>
                <h3>{item.title}</h3>
                <p>{item.category} · {shortDate(item.date)}</p>
              </div>
              <strong>{currency(item.amount)}</strong>
            </div>
          </article>
        ))}
        {!items.length && <p className="empty">No expenses found.</p>}
      </div>
    </section>
  );
}
