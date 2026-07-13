import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './Conversation.entity';
import { User } from './User.entity';

@Entity('ConversationParticipants')
export class ConversationParticipant {
  @PrimaryColumn({ name: 'ConversationId', type: 'uniqueidentifier' })
  conversationId: string;

  @PrimaryColumn({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'JoinedAt', type: 'datetime2' })
  joinedAt: Date;

  @ManyToOne(() => Conversation, c => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ConversationId' })
  conversation: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  user: User;
}
