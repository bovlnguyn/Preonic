import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Message } from './Message.entity';

@Entity('MessageAttachments')
export class MessageAttachment {
  @PrimaryGeneratedColumn({ name: 'AttachmentId' })
  id: number;

  @Column({ name: 'MessageId', type: 'uniqueidentifier' })
  messageId: string;

  @Column({ name: 'FileUrl', type: 'nvarchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'FileType', type: 'nvarchar', length: 50, nullable: true })
  fileType: string;

  @Column({ name: 'FileName', type: 'nvarchar', length: 255, nullable: true })
  fileName: string;

  @ManyToOne(() => Message, m => m.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MessageId' })
  message: Message;
}
