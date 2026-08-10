import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './User.entity';

@Entity('PaymentTransactions')
@Index(['status'])
@Index(['userId'])
@Index(['userId', 'createdAt'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'PaymentTransactionId' })
  id: string;

  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'Type', type: 'nvarchar', length: 30 })
  type: string;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'PaymentMethod', type: 'nvarchar', length: 20 })
  paymentMethod: string;

  @Column({ name: 'GatewayRef', type: 'nvarchar', length: 255, nullable: true })
  gatewayRef: string;

  @Column({ name: 'OrderCode', type: 'nvarchar', length: 100, nullable: true, unique: true })
  orderCode: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description: string;

  @Column({ name: 'BalanceBefore', type: 'decimal', precision: 18, scale: 2, nullable: true })
  balanceBefore: number;

  @Column({ name: 'BalanceAfter', type: 'decimal', precision: 18, scale: 2, nullable: true })
  balanceAfter: number;

  @Column({ name: 'Metadata', type: 'nvarchar', length: 'max', nullable: true })
  metadata: string;

  // ── Chỉ dùng cho type = 'withdraw' — thông tin ngân hàng nhận tiền do người dùng khai báo ──
  @Column({ name: 'BankName', type: 'nvarchar', length: 100, nullable: true })
  bankName: string;

  @Column({ name: 'BankAccountNumber', type: 'nvarchar', length: 50, nullable: true })
  bankAccountNumber: string;

  @Column({ name: 'BankAccountHolder', type: 'nvarchar', length: 150, nullable: true })
  bankAccountHolder: string;

  // ── Chỉ dùng khi admin từ chối yêu cầu rút tiền ──
  @Column({ name: 'RejectReason', type: 'nvarchar', length: 500, nullable: true })
  rejectReason: string;

  @Column({ name: 'ProcessedBy', type: 'uniqueidentifier', nullable: true })
  processedBy: string;

  @Column({ name: 'ProcessedAt', type: 'datetime2', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @Column({ name: 'CompletedAt', type: 'datetime2', nullable: true })
  completedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ProcessedBy' })
  processedByUser: User;
}
