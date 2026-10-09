import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PlatformFeePayment } from './PlatformFeePayment.entity';
import { PlatformFeeLedgerEntry } from './PlatformFeeLedgerEntry.entity';
import { PlatformFeeStatement } from './PlatformFeeStatement.entity';

@Entity('PlatformFeePaymentApplications')
@Index(
  'UX_PlatformFeePaymentApplications_Payment_Ledger',
  ['feePaymentId', 'feeLedgerEntryId'],
  { unique: true }
)
@Index('IX_PlatformFeePaymentApplications_Ledger', ['feeLedgerEntryId'])
@Index('IX_PlatformFeePaymentApplications_Statement', ['feeStatementId'])
export class PlatformFeePaymentApplication {
  @PrimaryGeneratedColumn('uuid', { name: 'FeePaymentApplicationId' })
  id: string;

  @Column({ name: 'FeePaymentId', type: 'uniqueidentifier' })
  feePaymentId: string;

  @Column({ name: 'FeeLedgerEntryId', type: 'uniqueidentifier' })
  feeLedgerEntryId: string;

  @Column({ name: 'FeeStatementId', type: 'uniqueidentifier', nullable: true })
  feeStatementId: string | null;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @ManyToOne(() => PlatformFeePayment, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FeePaymentId' })
  feePayment: PlatformFeePayment;

  @ManyToOne(() => PlatformFeeLedgerEntry, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FeeLedgerEntryId' })
  feeLedgerEntry: PlatformFeeLedgerEntry;

  @ManyToOne(() => PlatformFeeStatement, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FeeStatementId' })
  feeStatement: PlatformFeeStatement | null;
}
