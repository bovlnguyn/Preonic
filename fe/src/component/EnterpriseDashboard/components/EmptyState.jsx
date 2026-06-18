import React from 'react';
import { FiInbox } from 'react-icons/fi';

function EmptyState({
  title = 'Chưa có dữ liệu',
  desc  = 'Dữ liệu sẽ hiển thị tại đây sau khi hệ thống được cập nhật.',
}) {
  return (
    <div className="ent-empty">
      <FiInbox />
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

export default EmptyState;