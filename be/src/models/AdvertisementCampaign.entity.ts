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
import { User } from './User.entity';

export type AdvertisementCampaignStatus = 'active' | 'paused' | 'cancelled';

@Entity('AdvertisementCampaigns')
@Index('IX_AdvertisementCampaigns_Public', ['status', 'startsAt', 'endsAt'])
@Index('IX_AdvertisementCampaigns_Province', ['province', 'status', 'endsAt'])
@Index('IX_AdvertisementCampaigns_Farmer_CreatedAt', ['farmerId', 'createdAt'])
export class AdvertisementCampaign {
  @PrimaryGeneratedColumn('uuid', { name: 'AdvertisementCampaignId' })
  id: string;

  @Column({ name: 'FarmerId', type: 'uniqueidentifier' })
  farmerId: string;

  @Column({ name: 'Title', type: 'nvarchar', length: 140 })
  title: string;

  @Column({ name: 'Content', type: 'nvarchar', length: 800 })
  content: string;

  @Column({ name: 'BannerUrl', type: 'nvarchar', length: 1000 })
  bannerUrl: string;

  @Column({ name: 'TargetUrl', type: 'nvarchar', length: 500, nullable: true })
  targetUrl: string | null;

  @Column({ name: 'Province', type: 'nvarchar', length: 100, nullable: true })
  province: string | null;

  @Column({ name: 'District', type: 'nvarchar', length: 100, nullable: true })
  district: string | null;

  @Column({ name: 'DurationDays', type: 'smallint' })
  durationDays: number;

  @Column({ name: 'DailyRate', type: 'decimal', precision: 18, scale: 2 })
  dailyRate: number;

  @Column({ name: 'TotalAmount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'active' })
  status: AdvertisementCampaignStatus;

  @Column({ name: 'StartsAt', type: 'datetime2' })
  startsAt: Date;

  @Column({ name: 'EndsAt', type: 'datetime2' })
  endsAt: Date;

  @Column({ name: 'ImpressionCount', type: 'int', default: 0 })
  impressionCount: number;

  @Column({ name: 'ClickCount', type: 'int', default: 0 })
  clickCount: number;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FarmerId' })
  farmer: User;
}
