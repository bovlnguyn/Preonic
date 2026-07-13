import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Escrow } from './Escrow.entity';

@Entity('EscrowMilestones')
@Unique(['escrowId', 'step'])
export class EscrowMilestone {
  @PrimaryGeneratedColumn({ name: 'MilestoneId' })
  id: number;

  @Column({ name: 'EscrowId', type: 'uniqueidentifier' })
  escrowId: string;

  @Column({ name: 'Step', type: 'tinyint' })
  step: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 200 })
  name: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'RequiredBy', type: 'datetime2', nullable: true })
  requiredBy: Date;

  @Column({ name: 'FarmerConfirmed', type: 'bit', default: false })
  farmerConfirmed: boolean;

  @Column({ name: 'FarmerConfirmedAt', type: 'datetime2', nullable: true })
  farmerConfirmedAt: Date;

  @Column({ name: 'EnterpriseConfirmed', type: 'bit', default: false })
  enterpriseConfirmed: boolean;

  @Column({ name: 'EnterpriseConfirmedAt', type: 'datetime2', nullable: true })
  enterpriseConfirmedAt: Date;

  @Column({ name: 'ReleaseAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  releaseAmount: number;

  @Column({ name: 'ReleasePercentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  releasePercentage: number;

  @Column({ name: 'CompletedAt', type: 'datetime2', nullable: true })
  completedAt: Date;

  @Column({ name: 'Evidence', type: 'nvarchar', length: 'max', nullable: true })
  evidence: string;

  @ManyToOne(() => Escrow, e => e.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'EscrowId' })
  escrow: Escrow;
}
