import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User.entity';

// Bảng log chung: vừa ghi hành động quan trọng (Level='info'), vừa ghi lỗi hệ thống
// (Level='warn'/'error') — tránh trùng schema giữa 2 loại và cho phép truy vấn
// "toàn bộ log của 1 user" (kể cả lỗi họ gây ra) trên cùng 1 bảng. Append-only,
// không có UpdatedAt, theo đúng pattern của EscrowTransaction.
@Entity('SystemLogs')
@Index(['category', 'createdAt'])
@Index(['level', 'createdAt'])
@Index(['userId', 'createdAt'])
export class SystemLog {
  @PrimaryGeneratedColumn({ name: 'LogId' })
  id: number;

  @Column({ name: 'Category', type: 'nvarchar', length: 30 })
  category: 'auth' | 'contract' | 'escrow' | 'dispute' | 'payment' | 'cron' | 'api';

  @Column({ name: 'Action', type: 'nvarchar', length: 60 })
  action: string;

  @Column({ name: 'Level', type: 'nvarchar', length: 10, default: 'info' })
  level: 'info' | 'warn' | 'error';

  @Column({ name: 'UserId', type: 'uniqueidentifier', nullable: true })
  userId: string | null;

  @Column({ name: 'TargetType', type: 'nvarchar', length: 30, nullable: true })
  targetType: string | null;

  @Column({ name: 'TargetId', type: 'nvarchar', length: 100, nullable: true })
  targetId: string | null;

  @Column({ name: 'Message', type: 'nvarchar', length: 1000 })
  message: string;

  // JSON.stringify(...) — payload/context bổ sung (vd: request params, amount, contractCode)
  @Column({ name: 'Metadata', type: 'nvarchar', length: 'max', nullable: true })
  metadata: string | null;

  @Column({ name: 'StackTrace', type: 'nvarchar', length: 'max', nullable: true })
  stackTrace: string | null;

  @Column({ name: 'IpAddress', type: 'nvarchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  user: User;
}
