import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FulfillmentOrder } from './FulfillmentOrder.entity';
import { User } from './User.entity';

@Entity('CropProgressReports')
@Index('IX_CropProgressReports_Order_CreatedAt', ['orderId', 'createdAt'])
@Index('IX_CropProgressReports_Order_Status_DueAt', ['orderId', 'status', 'dueAt'])
export class CropProgressReport {
  @PrimaryGeneratedColumn('uuid', { name: 'ReportId' })
  id: string;

  @Column({ name: 'OrderId', type: 'uniqueidentifier' })
  orderId: string;

  @Column({ name: 'RequestedBy', type: 'uniqueidentifier', nullable: true })
  requestedBy: string | null;

  @Column({ name: 'RequestType', type: 'nvarchar', length: 20, default: 'periodic' })
  requestType: 'periodic' | 'enterprise';

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'requested' })
  status: 'requested' | 'submitted';

  @Column({ name: 'Title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'RequestNote', type: 'nvarchar', length: 1000, nullable: true })
  requestNote: string | null;

  @Column({ name: 'FarmerNote', type: 'nvarchar', length: 2000, nullable: true })
  farmerNote: string | null;

  @Column({ name: 'ImageUrls', type: 'nvarchar', length: 'max', nullable: true })
  imageUrlsJson: string | null;

  @Column({ name: 'DueAt', type: 'datetime2', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'SubmittedAt', type: 'datetime2', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => FulfillmentOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'OrderId' })
  order: FulfillmentOrder;

  @ManyToOne(() => User, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'RequestedBy' })
  requester: User | null;
}
