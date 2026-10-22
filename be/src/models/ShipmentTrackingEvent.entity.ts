import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FulfillmentOrder } from './FulfillmentOrder.entity';

@Entity('ShipmentTrackingEvents')
@Index('IX_ShipmentTrackingEvents_Order_OccurredAt', ['orderId', 'occurredAt'])
@Index('UX_ShipmentTrackingEvents_ProviderEvent', ['providerEventId'], {
  unique: true,
  where: '[ProviderEventId] IS NOT NULL',
})
export class ShipmentTrackingEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'TrackingEventId' })
  id: string;

  @Column({ name: 'OrderId', type: 'uniqueidentifier' })
  orderId: string;

  @Column({ name: 'ProviderEventId', type: 'nvarchar', length: 180, nullable: true })
  providerEventId: string | null;

  @Column({ name: 'Source', type: 'nvarchar', length: 20, default: 'manual' })
  source: 'manual' | 'ghn';

  @Column({ name: 'Status', type: 'nvarchar', length: 100 })
  status: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ name: 'Location', type: 'nvarchar', length: 500, nullable: true })
  location: string | null;

  @Column({ name: 'Latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ name: 'Longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ name: 'OccurredAt', type: 'datetime2' })
  occurredAt: Date;

  @Column({ name: 'RawPayload', type: 'nvarchar', length: 'max', nullable: true, select: false })
  rawPayload: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @ManyToOne(() => FulfillmentOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'OrderId' })
  order: FulfillmentOrder;
}
