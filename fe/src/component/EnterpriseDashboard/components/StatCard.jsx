import React from 'react';

function StatCard({ icon: Icon, label, value, change, tone = 'blue' }) {
  return (
    <article className={`ent-stat ent-stat--${tone}`}>
      <div className="ent-stat__icon">{Icon && <Icon />}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{change}</span>
      </div>
    </article>
  );
}

export default StatCard;