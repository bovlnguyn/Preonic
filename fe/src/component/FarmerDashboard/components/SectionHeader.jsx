import React from 'react';

function SectionHeader({ eyebrow, title, desc, action }) {
  return (
    <div className="farmer-section-header">
      <div>
        {eyebrow && <span className="farmer-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action && <div className="farmer-section-header__action">{action}</div>}
    </div>
  );
}

export default SectionHeader;
