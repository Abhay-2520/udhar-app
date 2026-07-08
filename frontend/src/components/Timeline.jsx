import { currency, shortDate } from '../utils/format.js';

export default function Timeline({ feed }) {
  return (
    <section className="panel">
      <div className="section-head">
        <h2>Activity Feed</h2>
        <span>{feed.length} entries</span>
      </div>
      <div className="timeline">
        {feed.map((item, index) => (
          <article className={`timeline-row ${item.overdue ? 'overdue-text' : ''}`} key={`${item.type}-${index}`}>
            <span className={`dot ${item.type}`} />
            <div>
              <h3>{item.title}</h3>
              <p>{item.type} · {shortDate(item.date)}{item.category ? ` · ${item.category}` : ''}</p>
            </div>
            <strong>{currency(item.amount)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
