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
import { FeeStatementStatus } from '../modules/direct-payment-v2/types';

@Entity('PlatformFeeStatements')
@Index('UX_PlatformFeeStatements_Code', ['statementCode'], { unique: true })
@Index('UX_PlatformFeeStatements_User_Period', ['userId', 'periodStart', 'periodEnd'], { unique: true })
@Index('IX_PlatformFeeStatements_User_Status_DueAt', ['userId', 'status', 'dueAt'])
export class PlatformFeeStatement {
  @PrimaryGeneratedColumn('uuid', { name: 'FeeStatementId' })
  id: string;

  @Column({ name: 'StatementCode', type: 'nvarchar', length: 50 })
  statementCode: string;

  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'PeriodStart', type: 'date' })
  periodStart: Date;

  @Column({ name: 'PeriodEnd', type: 'date' })
  periodEnd: Date;

  @Column({ name: 'OpeningBalanceSnapshot', type: 'decimal', precision: 18, scale: 2, default: 0 })
  openingBalanceSnapshot: number;

  @Column({ name: 'CurrentPeriodCharges', type: 'decimal', precision: 18, scale: 2, default: 0 })
  currentPeriodCharges: number;

  @Column({ name: 'CurrentPeriodCredits', type: 'decimal', precision: 18, scale: 2, default: 0 })
  currentPeriodCredits: number;

  @Column({ name: 'AmountDueSnapshot', type: 'decimal', precision: 18, scale: 2, default: 0 })
  amountDueSnapshot: number;

  @Column({ name: 'AmountPaid', type: 'decimal', precision: 18, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: 'draft' })
  status: FeeStatementStatus;

  @Column({ name: 'IssuedAt', type: 'datetime2', nullable: true })
  issuedAt: Date | null;

  @Column({ name: 'DueAt', type: 'datetime2', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'PaidAt', type: 'datetime2', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'UserId' })
  user: User;
}
