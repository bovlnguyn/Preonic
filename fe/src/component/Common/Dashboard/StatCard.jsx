import React from 'react';

function StatCard({ classPrefix, icon: Icon, label, value, change, tone }) {
  return (
    <article className={`${classPrefix}-stat ${classPrefix}-stat--${tone}`}>
      <div className={`${classPrefix}-stat__icon`}>{Icon && <Icon />}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {change && <span>{change}</span>}
      </div>
    </article>
  );
}

export default StatCard;
