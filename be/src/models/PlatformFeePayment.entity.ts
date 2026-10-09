import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';
import { PlatformFeeStatement } from './PlatformFeeStatement.entity';
import { FeePaymentStatus } from '../modules/direct-payment-v2/types';

@Entity('PlatformFeePayments')
@Index('UX_PlatformFeePayments_OrderCode', ['orderCode'], { unique: true })
@Index('UX_PlatformFeePayments_IdempotencyKey', ['idempotencyKey'], { unique: true })
@Index('UX_PlatformFeePayments_ProviderPayment', ['provider', 'providerPaymentId'], {
  unique: true,
  where: '[ProviderPaymentId] IS NOT NULL',
})
@Index('UX_PlatformFeePayments_TransferContent', ['transferContent'], { unique: true })
@Index('IX_PlatformFeePayments_User_Status', ['userId', 'status', 'createdAt'])
export class PlatformFeePayment {
  @PrimaryGeneratedColumn('uuid', { name: 'FeePaymentId' })
  id: string;

  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'FeeStatementId', type: 'uniqueidentifier', nullable: true })
  statementId: string | null;

  @Column({ name: 'OrderCode', type: 'nvarchar', length: 50 })
  orderCode: string;

  @Column({ name: 'IdempotencyKey', type: 'nvarchar', length: 128 })
  idempotencyKey: string;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'Currency', type: 'char', length: 3, default: 'VND' })
  currency: string;

  @Column({ name: 'Provider', type: 'nvarchar', length: 30 })
  provider: string;

  @Column({ name: 'ProviderPaymentId', type: 'nvarchar', length: 150, nullable: true })
  providerPaymentId: string | null;

  @Column({ name: 'TransferContent', type: 'nvarchar', length: 100 })
  transferContent: string;

  @Column({ name: 'PaymentUrl', type: 'nvarchar', length: 1000, nullable: true })
  paymentUrl: string | null;

  @Column({ name: 'QrPayload', type: 'nvarchar', length: 2000, nullable: true })
  qrPayload: string | null;

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'pending' })
  status: FeePaymentStatus;

  @Column({ name: 'ExpiresAt', type: 'datetime2', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'PaidAt', type: 'datetime2', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'UserId' })
  user: User;

  @ManyToOne(() => PlatformFeeStatement, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FeeStatementId' })
  statement: PlatformFeeStatement | null;
}
