import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Escrow } from './Escrow.entity';
import { User } from './User.entity';

@Entity('EscrowTransactions')
export class EscrowTransaction {
  @PrimaryGeneratedColumn({ name: 'TransactionId' })
  id: number;

  @Column({ name: 'EscrowId', type: 'uniqueidentifier' })
  escrowId: string;

  @Column({ name: 'Type', type: 'nvarchar', length: 20 })
  type: string;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'FromUserId', type: 'uniqueidentifier', nullable: true })
  fromUserId: string;

  @Column({ name: 'ToUserId', type: 'uniqueidentifier', nullable: true })
  toUserId: string;

  @Column({ name: 'MilestoneStep', type: 'tinyint', nullable: true })
  milestoneStep: number;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @ManyToOne(() => Escrow, e => e.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'EscrowId' })
  escrow: Escrow;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'FromUserId' })
  fromUser: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ToUserId' })
  toUser: User;
}
