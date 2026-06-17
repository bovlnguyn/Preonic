import React from 'react';

function StatCard({ icon: Icon, label, value, change, tone = 'green' }) {
  return (
    <article className={`farmer-stat farmer-stat--${tone}`}>
      <div className="farmer-stat__icon">{Icon && <Icon />}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{change}</span>
      </div>
    </article>
  );
}

export default StatCard;
