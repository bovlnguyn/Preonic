import { sendContactAcknowledgement, sendContactRequestEmail } from './email.service';

export type ContactAudience = 'public' | 'farmer' | 'enterprise';

export interface ContactRequestInput {
  audience: ContactAudience;
  topic: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
}

const TOPIC_LABELS: Record<string, string> = {
  account: 'Tài khoản và hồ sơ',
  product: 'Sản phẩm và nguồn cung',
  contract: 'Hợp đồng và đơn hàng',
  payment: 'Thanh toán hợp đồng và phí dịch vụ',
  billing: 'Tài khoản nhận tiền và phí dịch vụ',
  other: 'Vấn đề khác',
};

export const submitContactRequest = async (input: ContactRequestInput) => {
  const normalized = {
    audience: input.audience,
    topic: TOPIC_LABELS[input.topic.trim()] || input.topic.trim(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    company: input.company?.trim() || undefined,
    message: input.message.trim(),
  };

  const supportMessageId = await sendContactRequestEmail(normalized);
  let acknowledgementSent = true;

  try {
    await sendContactAcknowledgement(normalized);
  } catch {
    acknowledgementSent = false;
  }

  return { supportMessageId, acknowledgementSent };
};
