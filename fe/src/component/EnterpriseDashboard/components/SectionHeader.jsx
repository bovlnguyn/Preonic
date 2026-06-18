import React from 'react';

function SectionHeader({ eyebrow, title, desc, action }) {
  return (
    <div className="ent-section-header">
      <div>
        {eyebrow && <span className="ent-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action && <div className="ent-section-header__action">{action}</div>}
    </div>
  );
}

export default SectionHeader;