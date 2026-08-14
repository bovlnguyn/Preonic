import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Message } from './Message.entity';
import { User } from './User.entity';

@Entity('MessageReadBy')
@Index('IX_MessageReadBy_UserId_MessageId', ['userId', 'messageId'])
export class MessageReadBy {
  @PrimaryColumn({ name: 'MessageId', type: 'uniqueidentifier' })
  messageId: string;

  @PrimaryColumn({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'ReadAt', type: 'datetime2' })
  readAt: Date;

  @ManyToOne(() => Message, m => m.readBy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MessageId' })
  message: Message;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  user: User;
}
