import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Message } from './Message.entity';
import { User } from './User.entity';

@Entity('MessageReadBy')
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
