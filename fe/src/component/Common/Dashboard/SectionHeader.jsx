import React from 'react';
import { Link } from 'react-router-dom';

function SectionHeader({
  classPrefix,
  defaultHomePath,
  eyebrow,
  title,
  desc,
  action,
  breadcrumb,
}) {
  const hasBreadcrumb = Boolean(breadcrumb);
  const homePath = typeof breadcrumb === 'object' && breadcrumb?.homePath
    ? breadcrumb.homePath
    : defaultHomePath;

  const breadcrumbItems = (() => {
    if (!hasBreadcrumb) return [];
    if (typeof breadcrumb === 'string') return [{ label: breadcrumb }];
    if (Array.isArray(breadcrumb?.items)) return breadcrumb.items;
    if (breadcrumb?.label) return [{ label: breadcrumb.label, to: breadcrumb.to }];
    return [];
  })();

  return (
    <div className={`${classPrefix}-section-header${hasBreadcrumb ? ` ${classPrefix}-section-header--page` : ''}`}>
      <div className={`${classPrefix}-section-header__content`}>
        {hasBreadcrumb && (
          <nav className={`${classPrefix}-page-breadcrumb`} aria-label="Điều hướng trang">
            <Link to={homePath}>Trang chủ</Link>
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={`${item.label}-${index}`}>
                <span aria-hidden="true">/</span>
                {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        {eyebrow && <span className={`${classPrefix}-eyebrow`}>{eyebrow}</span>}
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action && <div className={`${classPrefix}-section-header__action`}>{action}</div>}
    </div>
  );
}

export default SectionHeader;
