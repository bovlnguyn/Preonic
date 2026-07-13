import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Conversation } from './Conversation.entity';
import { User } from './User.entity';
import { MessageAttachment } from './MessageAttachment.entity';
import { MessageReadBy } from './MessageReadBy.entity';

@Entity('Messages')
@Index(['conversationId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid', { name: 'MessageId' })
  id: string;

  @Column({ name: 'ConversationId', type: 'uniqueidentifier' })
  conversationId: string;

  @Column({ name: 'SenderId', type: 'uniqueidentifier' })
  senderId: string;

  @Column({ name: 'Text', type: 'nvarchar', length: 'max', nullable: true })
  text: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => Conversation, c => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ConversationId' })
  conversation: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'SenderId' })
  sender: User;

  @OneToMany(() => MessageAttachment, a => a.message, { cascade: true, eager: false })
  attachments: MessageAttachment[];

  @OneToMany(() => MessageReadBy, r => r.message, { cascade: true, eager: false })
  readBy: MessageReadBy[];
}
