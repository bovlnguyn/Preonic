import React from 'react';

function WalletStatusBadge({ classPrefix, tx }) {
  let tone = 'success';
  let label = 'Thành công';

  if (tx.source === 'payment' && tx.status === 'pending') {
    tone = 'warning';
    label = 'Đang chờ';
  } else if (tx.source === 'payment' && tx.status === 'rejected') {
    tone = 'danger';
    label = 'Đã từ chối';
  } else if (tx.source === 'payment' && tx.status && tx.status !== 'completed') {
    tone = 'danger';
    label = 'Thất bại';
  }

  return <span className={`${classPrefix}-badge ${classPrefix}-badge--${tone}`}>{label}</span>;
}

export default WalletStatusBadge;
