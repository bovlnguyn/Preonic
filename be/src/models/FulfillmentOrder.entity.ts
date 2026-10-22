import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from './Contract.entity';

export type FulfillmentStage =
  | 'cultivating'
  | 'ready_to_ship'
  | 'in_transit'
  | 'delivered'
  | 'completed';

@Entity('FulfillmentOrders')
@Index('UX_FulfillmentOrders_Contract', ['contractId'], { unique: true })
@Index('IX_FulfillmentOrders_Stage_UpdatedAt', ['stage', 'updatedAt'])
@Index('IX_FulfillmentOrders_TrackingCode', ['trackingCode'])
export class FulfillmentOrder {
  @PrimaryGeneratedColumn('uuid', { name: 'OrderId' })
  id: string;

  @Column({ name: 'ContractId', type: 'uniqueidentifier' })
  contractId: string;

  @Column({ name: 'Stage', type: 'nvarchar', length: 30, default: 'cultivating' })
  stage: FulfillmentStage;

  @Column({ name: 'Carrier', type: 'nvarchar', length: 30, default: 'ghn' })
  carrier: 'ghn' | 'manual';

  @Column({ name: 'TrackingCode', type: 'nvarchar', length: 100, nullable: true })
  trackingCode: string | null;

  @Column({ name: 'CarrierStatus', type: 'nvarchar', length: 100, nullable: true })
  carrierStatus: string | null;

  @Column({ name: 'LoadingPhotoUrl', type: 'nvarchar', length: 1000, nullable: true })
  loadingPhotoUrl: string | null;

  @Column({ name: 'ReportIntervalDays', type: 'smallint', default: 7 })
  reportIntervalDays: number;

  @Column({ name: 'NextReportDueAt', type: 'datetime2', nullable: true })
  nextReportDueAt: Date | null;

  @Column({ name: 'HandedToCarrierAt', type: 'datetime2', nullable: true })
  handedToCarrierAt: Date | null;

  @Column({ name: 'EnterpriseReceivedAt', type: 'datetime2', nullable: true })
  enterpriseReceivedAt: Date | null;

  @Column({ name: 'CompletedAt', type: 'datetime2', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'LastCarrierSyncAt', type: 'datetime2', nullable: true })
  lastCarrierSyncAt: Date | null;

  @Column({ name: 'CurrentLocation', type: 'nvarchar', length: 500, nullable: true })
  currentLocation: string | null;

  @Column({ name: 'CurrentLatitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLatitude: number | null;

  @Column({ name: 'CurrentLongitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLongitude: number | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @OneToOne(() => Contract, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ContractId' })
  contract: Contract;
}
