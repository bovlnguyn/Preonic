import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './User.entity';
import { Contract } from './Contract.entity';

@Entity('WeatherAlerts')
@Index(['alertType'])
@Index(['province'])
@Index(['severity'])
@Index(['userId', 'createdAt'])
export class WeatherAlert {
  @PrimaryGeneratedColumn('uuid', { name: 'WeatherAlertId' })
  id: string;

  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'ContractId', type: 'uniqueidentifier', nullable: true })
  contractId: string;

  @Column({ name: 'AlertType', type: 'nvarchar', length: 100 })
  alertType: string;

  @Column({ name: 'Severity', type: 'nvarchar', length: 20 })
  severity: string;

  @Column({ name: 'Province', type: 'nvarchar', length: 100, nullable: true })
  province: string;

  @Column({ name: 'District', type: 'nvarchar', length: 100, nullable: true })
  district: string;

  @Column({ name: 'Latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ name: 'Longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ name: 'Temperature', type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature: number;

  @Column({ name: 'Humidity', type: 'decimal', precision: 5, scale: 2, nullable: true })
  humidity: number;

  @Column({ name: 'WindSpeed', type: 'decimal', precision: 7, scale: 2, nullable: true })
  windSpeed: number;

  @Column({ name: 'Rain1h', type: 'decimal', precision: 7, scale: 2, nullable: true })
  rain1h: number;

  @Column({ name: 'Rain24h', type: 'decimal', precision: 7, scale: 2, nullable: true })
  rain24h: number;

  @Column({ name: 'WeatherDescription', type: 'nvarchar', length: 200, nullable: true })
  weatherDescription: string;

  @Column({ name: 'WeatherIcon', type: 'nvarchar', length: 50, nullable: true })
  weatherIcon: string;

  @Column({ name: 'ThresholdExceeded', type: 'nvarchar', length: 200, nullable: true })
  thresholdExceeded: string;

  @Column({ name: 'Message', type: 'nvarchar', length: 'max', nullable: true })
  message: string;

  @Column({ name: 'IsRead', type: 'bit', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  user: User;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'ContractId' })
  contract: Contract;
}
