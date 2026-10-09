import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';
import { Contract } from './Contract.entity';
import { DirectGoodsPayment } from './DirectGoodsPayment.entity';
import { PlatformFeePolicy } from './PlatformFeePolicy.entity';
import { PlatformFeeStatement } from './PlatformFeeStatement.entity';
import {
  FeeLedgerDirection,
  FeeLedgerEntryType,
  FeeLedgerStatus,
} from '../modules/direct-payment-v2/types';

@Entity('PlatformFeeLedgerEntries')
@Index('UX_PlatformFeeLedgerEntries_IdempotencyKey', ['idempotencyKey'], { unique: true })
@Index('IX_PlatformFeeLedgerEntries_User_Status_CreatedAt', ['userId', 'status', 'createdAt'])
@Index('IX_PlatformFeeLedgerEntries_Statement', ['statementId'])
@Index('IX_PlatformFeeLedgerEntries_Contract', ['contractId'])
@Index('IX_PlatformFeeLedgerEntries_GoodsPayment', ['goodsPaymentId', 'status'])
export class PlatformFeeLedgerEntry {
  @PrimaryGeneratedColumn('uuid', { name: 'FeeLedgerEntryId' })
  id: string;

  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'ContractId', type: 'uniqueidentifier', nullable: true })
  contractId: string | null;

  @Column({ name: 'GoodsPaymentId', type: 'uniqueidentifier', nullable: true })
  goodsPaymentId: string | null;

  @Column({ name: 'FeePolicyId', type: 'uniqueidentifier', nullable: true })
  feePolicyId: string | null;

  @Column({ name: 'FeeStatementId', type: 'uniqueidentifier', nullable: true })
  statementId: string | null;

  @Column({ name: 'EntryType', type: 'nvarchar', length: 40 })
  entryType: FeeLedgerEntryType;

  @Column({ name: 'Direction', type: 'nvarchar', length: 10 })
  direction: FeeLedgerDirection;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'FeeRateBps', type: 'int', nullable: true })
  feeRateBps: number | null;

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'pending' })
  status: FeeLedgerStatus;

  @Column({ name: 'IdempotencyKey', type: 'nvarchar', length: 160 })
  idempotencyKey: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'PostedAt', type: 'datetime2', nullable: true })
  postedAt: Date | null;

  @Column({ name: 'VoidedAt', type: 'datetime2', nullable: true })
  voidedAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'UserId' })
  user: User;

  @ManyToOne(() => Contract, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ContractId' })
  contract: Contract | null;

  @ManyToOne(() => DirectGoodsPayment, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'GoodsPaymentId' })
  goodsPayment: DirectGoodsPayment | null;

  @ManyToOne(() => PlatformFeePolicy, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FeePolicyId' })
  feePolicy: PlatformFeePolicy | null;

  @ManyToOne(() => PlatformFeeStatement, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FeeStatementId' })
  statement: PlatformFeeStatement | null;
}
