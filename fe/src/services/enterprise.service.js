import contractService from './contract.service';
import { COMPANY } from '../constants';

/**
 * Enterprise Service - Nghiep vu de xuat hop dong bao tieu phia doanh nghiep
 */

// Gia nhap tren UI luon la VND/kg; so luong co the nhap theo kg/ta/tan.
const UNIT_TO_KG = { kg: 1, tạ: 100, tấn: 1000 };

const enterpriseService = {
  COMMISSION_RATE: COMPANY.COMMISSION_RATE,
  UNIT_TO_KG,

  /**
   * Sinh ma hop dong xem truoc dang PRE-YYYY-XXXX.
   * Ma chinh thuc luon do backend cap khi tao hop dong (chong trung).
   */
  generateContractCode: () => {
    const year = new Date().getFullYear();
    const sequence = Math.floor(1000 + Math.random() * 9000);
    return `PRE-${year}-${sequence}`;
  },

  /**
   * Tinh tong gia tri hop dong va phi hoa hong 3% tu so luong, don gia (luon la VND/kg), don vi so luong.
   * unitFactor quy doi so luong ve kg de nhan voi don gia/kg.
   * Backend luu contract.pricePerUnit theo contract.unit, nen khi gui de xuat can nhan
   * don gia/kg voi unitFactor de ra don gia tuong ung voi don vi da chon (xem handleSubmitProposal).
   */
  calculateContractTotals: ({ quantity, pricePerUnit, unit }) => {
    const unitFactor = UNIT_TO_KG[unit] || 1;
    const totalValue = (parseFloat(quantity) || 0) * (parseFloat(pricePerUnit) || 0) * unitFactor;
    const commission = totalValue * (COMPANY.COMMISSION_RATE / 100);
    return { totalValue, commission, unitFactor };
  },

  /**
   * Quy doi phuong thuc thanh toan sang ty le dat coc (%).
   */
  resolveDepositPercentage: (paymentTerms, customDeposit) => {
    if (paymentTerms === '50_50') return 50;
    if (paymentTerms === '30_70') return 30;
    if (paymentTerms === '100_upfront') return 100;
    if (paymentTerms === '100_delivery') return 0;
    if (paymentTerms === 'custom') return parseFloat(customDeposit) || 0;
    return 0;
  },

  /**
   * Buoc 1-5: gui de xuat hop dong bao tieu toi backend.
   */
  proposeContract: async (payload) => contractService.create(payload),
};

export default enterpriseService;
