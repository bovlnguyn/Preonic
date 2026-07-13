import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './User.entity';

@Entity('Notifications')
@Index(['type'])
@Index(['userId', 'createdAt'])
@Index(['userId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid', { name: 'NotificationId' })
  id: string;

  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'Type', type: 'nvarchar', length: 100 })
  type: string;

  @Column({ name: 'Title', type: 'nvarchar', length: 300 })
  title: string;

  @Column({ name: 'Message', type: 'nvarchar', length: 'max', nullable: true })
  message: string;

  @Column({ name: 'IsRead', type: 'bit', default: false })
  isRead: boolean;

  @Column({ name: 'RelatedId', type: 'nvarchar', length: 100, nullable: true })
  relatedId: string;

  @Column({ name: 'RelatedModel', type: 'nvarchar', length: 100, nullable: true })
  relatedModel: string;

  @Column({ name: 'Severity', type: 'nvarchar', length: 10, default: 'info' })
  severity: string;

  @Column({ name: 'EmailSent', type: 'bit', default: false })
  emailSent: boolean;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  user: User;
}
