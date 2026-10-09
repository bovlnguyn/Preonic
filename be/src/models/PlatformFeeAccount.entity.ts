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
import { FeeAccountStatus } from '../modules/direct-payment-v2/types';

@Entity('PlatformFeeAccounts')
@Index('UX_PlatformFeeAccounts_User', ['userId'], { unique: true })
@Index('IX_PlatformFeeAccounts_Status', ['status', 'updatedAt'])
export class PlatformFeeAccount {
  @PrimaryGeneratedColumn('uuid', { name: 'FeeAccountId' })
  id: string;

  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  /**
   * Cached projections for fast authorization/dashboard checks.
   * FeeLedgerEntries remain the financial source of truth.
   */
  @Column({ name: 'OutstandingAmount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  outstandingAmount: number;

  @Column({ name: 'OverdueAmount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  overdueAmount: number;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: 'good_standing' })
  status: FeeAccountStatus;

  @Column({ name: 'RestrictedAt', type: 'datetime2', nullable: true })
  restrictedAt: Date | null;

  @Column({ name: 'LastCalculatedAt', type: 'datetime2', nullable: true })
  lastCalculatedAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'UserId' })
  user: User;
}
