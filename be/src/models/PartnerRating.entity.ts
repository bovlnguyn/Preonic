import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique, Index,
} from 'typeorm';
import { Contract } from './Contract.entity';
import { User } from './User.entity';

@Entity('PartnerRatings')
@Unique(['contractId', 'reviewerId'])
@Index(['reviewerId'])
@Index(['revieweeId'])
export class PartnerRating {
  @PrimaryGeneratedColumn('uuid', { name: 'PartnerRatingId' })
  id: string;

  @Column({ name: 'ContractId', type: 'uniqueidentifier' })
  contractId: string;

  @Column({ name: 'ReviewerId', type: 'uniqueidentifier' })
  reviewerId: string;

  @Column({ name: 'RevieweeId', type: 'uniqueidentifier' })
  revieweeId: string;

  @Column({ name: 'ReviewerRole', type: 'nvarchar', length: 20 })
  reviewerRole: string;

  @Column({ name: 'RevieweeRole', type: 'nvarchar', length: 20 })
  revieweeRole: string;

  @Column({ name: 'Transparency', type: 'tinyint', nullable: true })
  transparency: number;

  @Column({ name: 'PaymentPunctuality', type: 'tinyint', nullable: true })
  paymentPunctuality: number;

  @Column({ name: 'Coordination', type: 'tinyint', nullable: true })
  coordination: number;

  @Column({ name: 'Quality', type: 'tinyint', nullable: true })
  quality: number;

  @Column({ name: 'OnTimeDelivery', type: 'tinyint', nullable: true })
  onTimeDelivery: number;

  @Column({ name: 'CommittedVolume', type: 'tinyint', nullable: true })
  committedVolume: number;

  @Column({ name: 'OverallRating', type: 'decimal', precision: 3, scale: 2 })
  overallRating: number;

  @Column({ name: 'Comment', type: 'nvarchar', length: 'max', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'ContractId' })
  contract: Contract;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ReviewerId' })
  reviewer: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'RevieweeId' })
  reviewee: User;
}
