// Tách helper xây dựng danh sách milestone của escrow ra utility riêng.
// Lý do: escrow.service.ts đã > 700 dòng và builder này thuần data — không phụ thuộc DB.

export type PaymentTerms = '50_50' | '30_70' | '100_delivery' | '100_upfront' | 'custom';

export interface IMilestone {
  step: number;
  name: string;
  description: string;
  requiredBy: 'farmer' | 'enterprise' | 'both';
  status: 'pending';
  farmerConfirmed: boolean;
  enterpriseConfirmed: boolean;
  releasePercentage: number;
  releaseAmount: number;
}

const MILESTONE_COUNT = 5;
const PERCENT_TOTAL = 100;

// Phân bổ phần trăm giải ngân theo từng mốc (step 1 → step 5).
// Cơ chế hiện tại của PreOnic: doanh nghiệp nạp 100% totalValue vào Escrow.
// - 50/50, 30/70: phần đặt cọc giải ngân ở step 1, phần còn lại ở step 5.
// - 100_delivery: giải ngân ở step 4 khi doanh nghiệp xác nhận nhận/kiểm tra hàng,
//   nhưng hợp đồng CHỈ completed sau step 5.
// - 100_upfront: giải ngân ở step 1, nhưng hợp đồng vẫn đi đủ quy trình đến step 5.
const RELEASE_PERCENT_BY_TERMS: Record<Exclude<PaymentTerms, 'custom'>, [number, number, number, number, number]> = {
  '50_50':        [ 50, 0, 0,   0, 50],
  '30_70':        [ 30, 0, 0,   0, 70],
  '100_delivery': [  0, 0, 0, 100,  0],
  '100_upfront':  [100, 0, 0,   0,  0],
};

const MILESTONE_TEMPLATES = [
  { step: 1, name: 'Ký quỹ',              description: 'Doanh nghiệp đặt cọc ký quỹ theo giá trị hợp đồng',              requiredBy: 'enterprise' as const },
  { step: 2, name: 'Chuẩn bị hàng hóa',   description: 'Nông dân chuẩn bị và đóng gói sản phẩm theo yêu cầu',             requiredBy: 'farmer'     as const },
  { step: 3, name: 'Giao hàng',            description: 'Nông dân xác nhận đã gửi hàng và cung cấp thông tin vận chuyển',   requiredBy: 'farmer'     as const },
  { step: 4, name: 'Kiểm tra chất lượng', description: 'Doanh nghiệp nhận hàng và kiểm tra chất lượng sản phẩm',           requiredBy: 'enterprise' as const },
  { step: 5, name: 'Hoàn tất',             description: 'Hai bên xác nhận hoàn thành — giải ngân số dư còn lại nếu có',     requiredBy: 'both'       as const },
];

export function getMilestoneRequiredRole(step: number): 'farmer' | 'enterprise' | 'both' | undefined {
  return MILESTONE_TEMPLATES.find((t) => t.step === step)?.requiredBy;
}

const normalizePercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((Math.min(100, Math.max(0, value)) + Number.EPSILON) * 100) / 100;
};

export function buildMilestones(
  paymentTerms: PaymentTerms,
  totalAmount: number,
  depositPercentage?: number | null
): IMilestone[] {
  let pcts: [number, number, number, number, number];

  if (paymentTerms === 'custom') {
    // Custom hiện được UI định nghĩa bằng hai phần: đặt cọc + phần còn lại.
    // Giữ cùng semantics với 50/50 và 30/70: đặt cọc ở step 1, số dư ở step 5.
    const deposit = normalizePercentage(Number(depositPercentage));
    const remainder = Math.round((PERCENT_TOTAL - deposit + Number.EPSILON) * 100) / 100;
    pcts = [deposit, 0, 0, 0, remainder];
  } else {
    pcts = RELEASE_PERCENT_BY_TERMS[paymentTerms];
  }

  return MILESTONE_TEMPLATES.map((template, index) => ({
    ...template,
    status: 'pending' as const,
    farmerConfirmed: false,
    enterpriseConfirmed: false,
    releasePercentage: pcts[index],
    releaseAmount: Math.round(((totalAmount * pcts[index]) / PERCENT_TOTAL + Number.EPSILON) * 100) / 100,
  }));
}

export const MILESTONE_CONFIG = {
  COUNT: MILESTONE_COUNT,
  PERCENT_TOTAL,
} as const;
