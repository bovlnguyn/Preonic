import { AppDataSource } from '../../config/database';
import { Contract } from '../../models/Contract.entity';
import { DirectGoodsPayment } from '../../models/DirectGoodsPayment.entity';
import { PlatformFeeLedgerEntry } from '../../models/PlatformFeeLedgerEntry.entity';

export type CashflowReportRole = 'farmer' | 'enterprise';

const money = (value: unknown): number => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};

const monthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const buildMonthRange = (months: number): Array<{ key: string; label: string }> => {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index, 1));
    return {
      key: monthKey(date),
      label: `T${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`,
    };
  });
};

export async function getCashflowReport(
  userId: string,
  role: CashflowReportRole,
  months = 12
) {
  const monthRange = buildMonthRange(months);
  const periodStart = new Date(`${monthRange[0].key}-01T00:00:00.000Z`);
  const paymentUserColumn = role === 'farmer' ? 'payment.PayeeUserId' : 'payment.PayerUserId';
  const contractUserColumn = role === 'farmer' ? 'contract.FarmerId' : 'contract.EnterpriseId';
  const partnerNameColumn = role === 'farmer' ? 'contract.EnterpriseName' : 'contract.FarmerName';

  const paymentRepo = AppDataSource.getRepository(DirectGoodsPayment);
  const feeRepo = AppDataSource.getRepository(PlatformFeeLedgerEntry);
  const contractRepo = AppDataSource.getRepository(Contract);

  const [paymentSummary, feeSummary, monthlyPayments, monthlyFees, contractSummary, contracts] = await Promise.all([
    paymentRepo
      .createQueryBuilder('payment')
      .select("COALESCE(SUM(CASE WHEN payment.Status = 'confirmed' THEN payment.Amount ELSE 0 END), 0)", 'confirmedAllTime')
      .addSelect("COALESCE(SUM(CASE WHEN payment.Status = 'confirmed' AND payment.ConfirmedAt >= :periodStart THEN payment.Amount ELSE 0 END), 0)", 'confirmedInPeriod')
      .addSelect("SUM(CASE WHEN payment.Status = 'confirmed' THEN 1 ELSE 0 END)", 'confirmedCount')
      .addSelect("COALESCE(SUM(CASE WHEN payment.Status IN ('payable','awaiting_payment','awaiting_confirmation','disputed') THEN payment.Amount ELSE 0 END), 0)", 'pendingAmount')
      .where(`${paymentUserColumn} = :userId`, { userId, periodStart })
      .getRawOne(),

    feeRepo
      .createQueryBuilder('entry')
      .select("COALESCE(SUM(CASE WHEN entry.Status = 'posted' AND entry.Direction = 'debit' THEN entry.Amount WHEN entry.Status = 'posted' AND entry.Direction = 'credit' THEN -entry.Amount ELSE 0 END), 0)", 'feeAllTime')
      .addSelect("COALESCE(SUM(CASE WHEN entry.Status = 'posted' AND entry.PostedAt >= :periodStart AND entry.Direction = 'debit' THEN entry.Amount WHEN entry.Status = 'posted' AND entry.PostedAt >= :periodStart AND entry.Direction = 'credit' THEN -entry.Amount ELSE 0 END), 0)", 'feeInPeriod')
      .where('entry.UserId = :userId', { userId, periodStart })
      .getRawOne(),

    paymentRepo
      .createQueryBuilder('payment')
      .select('YEAR(payment.ConfirmedAt)', 'year')
      .addSelect('MONTH(payment.ConfirmedAt)', 'month')
      .addSelect('COALESCE(SUM(payment.Amount), 0)', 'amount')
      .where(`${paymentUserColumn} = :userId`, { userId, periodStart })
      .andWhere("payment.Status = 'confirmed'")
      .andWhere('payment.ConfirmedAt >= :periodStart')
      .groupBy('YEAR(payment.ConfirmedAt)')
      .addGroupBy('MONTH(payment.ConfirmedAt)')
      .getRawMany(),

    feeRepo
      .createQueryBuilder('entry')
      .select('YEAR(entry.PostedAt)', 'year')
      .addSelect('MONTH(entry.PostedAt)', 'month')
      .addSelect("COALESCE(SUM(CASE WHEN entry.Direction = 'debit' THEN entry.Amount ELSE -entry.Amount END), 0)", 'amount')
      .where('entry.UserId = :userId', { userId, periodStart })
      .andWhere("entry.Status = 'posted'")
      .andWhere('entry.PostedAt >= :periodStart')
      .groupBy('YEAR(entry.PostedAt)')
      .addGroupBy('MONTH(entry.PostedAt)')
      .getRawMany(),

    contractRepo
      .createQueryBuilder('contract')
      .select("SUM(CASE WHEN contract.Status <> 'draft' THEN 1 ELSE 0 END)", 'totalContracts')
      .addSelect("SUM(CASE WHEN contract.Status = 'active' THEN 1 ELSE 0 END)", 'activeContracts')
      .addSelect("SUM(CASE WHEN contract.Status = 'completed' THEN 1 ELSE 0 END)", 'completedContracts')
      .addSelect("COALESCE(SUM(CASE WHEN contract.Status NOT IN ('draft','cancelled') THEN contract.TotalValue ELSE 0 END), 0)", 'committedValue')
      .where(`${contractUserColumn} = :userId`, { userId })
      .getRawOne(),

    contractRepo
      .createQueryBuilder('contract')
      .select('contract.ContractId', 'id')
      .addSelect('contract.ContractCode', 'contractCode')
      .addSelect('contract.ProductName', 'productName')
      .addSelect(partnerNameColumn, 'partnerName')
      .addSelect('contract.Status', 'status')
      .addSelect('contract.TotalValue', 'totalValue')
      .addSelect('contract.PaidAmount', 'paidAmount')
      .addSelect('contract.RemainingAmount', 'remainingAmount')
      .addSelect('contract.CreatedAt', 'createdAt')
      .where(`${contractUserColumn} = :userId`, { userId })
      .andWhere("contract.Status <> 'draft'")
      .orderBy('contract.createdAt', 'DESC')
      .take(50)
      .getRawMany(),
  ]);

  const paymentByMonth = new Map(
    monthlyPayments.map((row: any) => [
      `${Number(row.year)}-${String(Number(row.month)).padStart(2, '0')}`,
      money(row.amount),
    ])
  );
  const feeByMonth = new Map(
    monthlyFees.map((row: any) => [
      `${Number(row.year)}-${String(Number(row.month)).padStart(2, '0')}`,
      money(row.amount),
    ])
  );

  const cashflow = monthRange.map((month) => {
    const goodsAmount = paymentByMonth.get(month.key) || 0;
    const serviceFee = feeByMonth.get(month.key) || 0;
    return {
      month: month.key,
      label: month.label,
      goodsAmount,
      serviceFee,
      netAmount: role === 'farmer' ? money(goodsAmount - serviceFee) : money(goodsAmount + serviceFee),
    };
  });

  const confirmedAllTime = money(paymentSummary?.confirmedAllTime);
  const confirmedInPeriod = money(paymentSummary?.confirmedInPeriod);
  const feeAllTime = money(feeSummary?.feeAllTime);
  const feeInPeriod = money(feeSummary?.feeInPeriod);

  return {
    role,
    period: {
      months,
      from: periodStart.toISOString(),
      to: new Date().toISOString(),
    },
    summary: {
      goodsCashflowAllTime: confirmedAllTime,
      goodsCashflowInPeriod: confirmedInPeriod,
      serviceFeeAllTime: feeAllTime,
      serviceFeeInPeriod: feeInPeriod,
      netCashflowAllTime: role === 'farmer'
        ? money(confirmedAllTime - feeAllTime)
        : money(confirmedAllTime + feeAllTime),
      pendingGoodsAmount: money(paymentSummary?.pendingAmount),
      confirmedPaymentCount: Number(paymentSummary?.confirmedCount || 0),
      totalContracts: Number(contractSummary?.totalContracts || 0),
      activeContracts: Number(contractSummary?.activeContracts || 0),
      completedContracts: Number(contractSummary?.completedContracts || 0),
      committedContractValue: money(contractSummary?.committedValue),
    },
    cashflow,
    contracts: contracts.map((contract: any) => ({
      ...contract,
      totalValue: money(contract.totalValue),
      paidAmount: money(contract.paidAmount),
      remainingAmount: money(contract.remainingAmount),
    })),
  };
}
