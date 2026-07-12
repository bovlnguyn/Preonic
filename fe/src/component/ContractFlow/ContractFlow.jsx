import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import './ContractFlow.css';

/**
 * Thanh tien trinh hop dong — dung chung cho luong tao de xuat (enterprise)
 * va luong theo doi/ky xac nhan (farmer + enterprise).
 *
 * currentIndex: chi so buoc dang thuc hien (cac buoc < currentIndex la da xong).
 *   Truyen currentIndex = steps.length de danh dau TAT CA buoc da hoan tat.
 * cancelled: neu true, hien thi trang thai "Da huy" thay vi tiep tuc tien trinh.
 */
function ContractFlow({ steps, currentIndex, cancelled = false, cancelledLabel = 'Đã hủy' }) {
  return (
    <div className="cf-steps">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = !cancelled && i === currentIndex;
        const isCancelledStep = cancelled && i === currentIndex;

        return (
          <React.Fragment key={s.key}>
            <div
              className={
                'cf-step' +
                (active ? ' cf-step--active' : '') +
                (done ? ' cf-step--done' : '') +
                (isCancelledStep ? ' cf-step--cancelled' : '')
              }
            >
              <div className="cf-step__dot">
                {isCancelledStep ? <FiX size={14} /> : done ? <FiCheck size={14} /> : <span>{i + 1}</span>}
              </div>
              <span className="cf-step__label">{isCancelledStep ? cancelledLabel : s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`cf-step__line ${done ? 'cf-step__line--done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default ContractFlow;
