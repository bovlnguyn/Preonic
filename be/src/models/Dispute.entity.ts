import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Contract } from './Contract.entity';
import { Escrow } from './Escrow.entity';
import { User } from './User.entity';
import { DisputeEvidence } from './DisputeEvidence.entity';

@Entity('Disputes')
@Index(['contractId'])
@Index(['escrowId'])
@Index(['raisedBy'])
@Index(['status'])
@Index('IX_Disputes_RaisedBy_Status_CreatedAt', ['raisedBy', 'status', 'createdAt'])
@Index('IX_Disputes_Against_Status_CreatedAt', ['againstUserId', 'status', 'createdAt'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid', { name: 'DisputeId' })
  id: string;

  @Column({ name: 'ContractId', type: 'uniqueidentifier' })
  contractId: string;

  @Column({ name: 'EscrowId', type: 'uniqueidentifier' })
  escrowId: string;

  @Column({ name: 'MilestoneStep', type: 'tinyint', nullable: true })
  milestoneStep: number;

  @Column({ name: 'RaisedBy', type: 'uniqueidentifier' })
  raisedBy: string;

  @Column({ name: 'RaisedByRole', type: 'nvarchar', length: 20 })
  raisedByRole: string;

  @Column({ name: 'AgainstUserId', type: 'uniqueidentifier' })
  againstUserId: string;

  @Column({ name: 'Reason', type: 'nvarchar', length: 'max' })
  reason: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'open' })
  status: string;

  @Column({ name: 'AdminNotes', type: 'nvarchar', length: 'max', nullable: true })
  adminNotes: string;

  @Column({ name: 'ResolvedAt', type: 'datetime2', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'Resolution', type: 'nvarchar', length: 'max', nullable: true })
  resolution: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'ContractId' })
  contract: Contract;

  @ManyToOne(() => Escrow)
  @JoinColumn({ name: 'EscrowId' })
  escrow: Escrow;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'RaisedBy' })
  raisedByUser: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'AgainstUserId' })
  againstUser: User;

  @OneToMany(() => DisputeEvidence, e => e.dispute, { cascade: true, eager: false })
  evidences: DisputeEvidence[];
}
