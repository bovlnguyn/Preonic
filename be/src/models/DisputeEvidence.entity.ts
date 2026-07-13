import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Dispute } from './Dispute.entity';

@Entity('DisputeEvidences')
export class DisputeEvidence {
  @PrimaryGeneratedColumn({ name: 'EvidenceId' })
  id: number;

  @Column({ name: 'DisputeId', type: 'uniqueidentifier' })
  disputeId: string;

  @Column({ name: 'FileUrl', type: 'nvarchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'FileType', type: 'nvarchar', length: 50, nullable: true })
  fileType: string;

  @Column({ name: 'UploadedAt', type: 'datetime2' })
  uploadedAt: Date;

  @ManyToOne(() => Dispute, d => d.evidences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'DisputeId' })
  dispute: Dispute;
}
