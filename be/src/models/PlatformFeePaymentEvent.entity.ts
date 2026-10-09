import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PlatformFeePayment } from './PlatformFeePayment.entity';

@Entity('PlatformFeePaymentEvents')
@Index('UX_PlatformFeePaymentEvents_ProviderEvent', ['provider', 'providerEventId'], {
  unique: true,
  where: '[ProviderEventId] IS NOT NULL',
})
@Index('IX_PlatformFeePaymentEvents_Payment_CreatedAt', ['feePaymentId', 'createdAt'])
export class PlatformFeePaymentEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'FeePaymentEventId' })
  id: string;

  @Column({ name: 'FeePaymentId', type: 'uniqueidentifier' })
  feePaymentId: string;

  @Column({ name: 'Provider', type: 'nvarchar', length: 30 })
  provider: string;

  @Column({ name: 'ProviderEventId', type: 'nvarchar', length: 150, nullable: true })
  providerEventId: string | null;

  @Column({ name: 'EventType', type: 'nvarchar', length: 60 })
  eventType: string;

  @Column({ name: 'PayloadHash', type: 'char', length: 64 })
  payloadHash: string;

  @Column({ name: 'SanitizedPayload', type: 'nvarchar', length: 'max', nullable: true })
  sanitizedPayload: string | null;

  @Column({ name: 'OccurredAt', type: 'datetime2', nullable: true })
  occurredAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @ManyToOne(() => PlatformFeePayment, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FeePaymentId' })
  feePayment: PlatformFeePayment;
}
