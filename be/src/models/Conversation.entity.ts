import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ConversationParticipant } from './ConversationParticipant.entity';
import { Message } from './Message.entity';

@Entity('Conversations')
@Index('IX_Conversations_LastMessageAt_CreatedAt', ['lastMessageAt', 'createdAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid', { name: 'ConversationId' })
  id: string;

  @Column({ name: 'LastMessage', type: 'nvarchar', length: 'max', nullable: true })
  lastMessage: string;

  @Column({ name: 'LastMessageAt', type: 'datetime2', nullable: true })
  lastMessageAt: Date;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @OneToMany(() => ConversationParticipant, p => p.conversation, { cascade: true, eager: false })
  participants: ConversationParticipant[];

  @OneToMany(() => Message, m => m.conversation, { cascade: true, eager: false })
  messages: Message[];
}
