import { User } from '../models/User.entity';
import { sendNotificationEmail, buildContractUrl } from '../services/email.service';
import { displayName } from './user.util';

// Email khong duoc lam gian doan luong nghiep vu hop dong -- loi gui
// mail chi log, khong throw.
export const notifyContractEmail = async (
  user: User | null | undefined,
  role: 'farmer' | 'enterprise',
  title: string,
  message: string,
  contractId: string
) => {
  if (!user?.email) return;
  try {
    await sendNotificationEmail(user.email, displayName(user), title, message, buildContractUrl(role, contractId));
  } catch (err: any) {
    console.error('Loi gui email thong bao hop dong:', err.message || err);
  }
};
