import React from 'react';
import { Link } from 'react-router-dom';

function SectionHeader({ eyebrow, title, desc, action, breadcrumb }) {
  const hasBreadcrumb = Boolean(breadcrumb);
  const currentLabel = typeof breadcrumb === 'string' ? breadcrumb : breadcrumb?.label;
  const homePath = typeof breadcrumb === 'object' && breadcrumb?.homePath
    ? breadcrumb.homePath
    : '/farmer';

  return (
    <div className={`farmer-section-header${hasBreadcrumb ? ' farmer-section-header--page' : ''}`}>
      <div className="farmer-section-header__content">
        {hasBreadcrumb && (
          <nav className="farmer-page-breadcrumb" aria-label="Điều hướng trang">
            <Link to={homePath}>Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <span>{currentLabel}</span>
          </nav>
        )}
        {eyebrow && <span className="farmer-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action && <div className="farmer-section-header__action">{action}</div>}
    </div>
  );
}

export default SectionHeader;
