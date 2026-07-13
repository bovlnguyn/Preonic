import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Contract } from './Contract.entity';
import { User } from './User.entity';
import { EscrowMilestone } from './EscrowMilestone.entity';
import { EscrowTransaction } from './EscrowTransaction.entity';

@Entity('Escrows')
@Index(['farmerId'])
@Index(['enterpriseId'])
@Index(['status'])
export class Escrow {
  @PrimaryGeneratedColumn('uuid', { name: 'EscrowId' })
  id: string;

  @Column({ name: 'ContractId', type: 'uniqueidentifier', unique: true })
  contractId: string;

  @Column({ name: 'FarmerId', type: 'uniqueidentifier' })
  farmerId: string;

  @Column({ name: 'EnterpriseId', type: 'uniqueidentifier' })
  enterpriseId: string;

  @Column({ name: 'TotalAmount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  @Column({ name: 'DepositedAmount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  depositedAmount: number;

  @Column({ name: 'ReleasedAmount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  releasedAmount: number;

  @Column({ name: 'RefundedAmount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @OneToOne(() => Contract)
  @JoinColumn({ name: 'ContractId' })
  contract: Contract;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'FarmerId' })
  farmer: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'EnterpriseId' })
  enterprise: User;

  @OneToMany(() => EscrowMilestone, m => m.escrow, { cascade: true, eager: false })
  milestones: EscrowMilestone[];

  @OneToMany(() => EscrowTransaction, t => t.escrow, { cascade: true, eager: false })
  transactions: EscrowTransaction[];
}
