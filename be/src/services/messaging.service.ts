import { EntityManager, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Conversation } from '../models/Conversation.entity';
import { ConversationParticipant } from '../models/ConversationParticipant.entity';
import { Message } from '../models/Message.entity';
import { MessageReadBy } from '../models/MessageReadBy.entity';
import { Notification } from '../models/Notification.entity';
import { User } from '../models/User.entity';
import { makeError } from '../utils/error.util';
import { displayName } from '../utils/user.util';
import { lockByIdOrFail, lockManyByIds, runLockedTransaction } from '../utils/transaction-lock.util';

const conversationRepo = () => AppDataSource.getRepository(Conversation);
const participantRepo = () => AppDataSource.getRepository(ConversationParticipant);
const messageRepo = () => AppDataSource.getRepository(Message);

const MAX_MESSAGE_LENGTH = 4000;
const NOTIFICATION_PREVIEW_LENGTH = 140;

const ensureParticipantWithManager = async (
  manager: EntityManager,
  conversationId: string,
  userId: string
) => {
  const participant = await manager.getRepository(ConversationParticipant).findOne({
    where: { conversationId, userId },
  });
  if (!participant) throw makeError('Ban khong phai thanh vien cua cuoc hoi thoai nay', 403);
  return participant;
};

const ensureParticipant = async (conversationId: string, userId: string) => {
  const participant = await participantRepo().findOne({ where: { conversationId, userId } });
  if (!participant) throw makeError('Ban khong phai thanh vien cua cuoc hoi thoai nay', 403);
  return participant;
};

const getUnreadCountsByConversation = async (conversationIds: string[], userId: string) => {
  if (conversationIds.length === 0) return {} as Record<string, number>;

  const rows = await messageRepo()
    .createQueryBuilder('message')
    .select('message.conversationId', 'conversationId')
    .addSelect('COUNT(*)', 'count')
    .leftJoin('message.readBy', 'readBy', 'readBy.userId = :userId', { userId })
    .where('message.conversationId IN (:...ids)', { ids: conversationIds })
    .andWhere('message.senderId != :userId', { userId })
    .andWhere('readBy.userId IS NULL')
    .groupBy('message.conversationId')
    .getRawMany();

  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.conversationId] = Number(row.count);
  }
  return map;
};

const formatConversation = (
  conversation: Conversation,
  partner: User | undefined,
  unreadCount: number
) => ({
  id: conversation.id,
  partner: partner
    ? {
        id: partner.id,
        name: displayName(partner),
        role: partner.role,
        avatar: partner.avatar,
      }
    : null,
  lastMessage: conversation.lastMessage,
  lastMessageAt: conversation.lastMessageAt,
  unreadCount,
  createdAt: conversation.createdAt,
});

const buildConversationDetail = async (conversationId: string, userId: string) => {
  const conversation = await conversationRepo().findOne({ where: { id: conversationId } });
  if (!conversation) throw makeError('Khong tim thay cuoc hoi thoai', 404);

  const participants = await participantRepo().find({
    where: { conversationId },
    relations: ['user'],
  });
  const partner = participants.find((p) => p.userId !== userId)?.user;

  const unreadMap = await getUnreadCountsByConversation([conversationId], userId);

  return formatConversation(conversation, partner, unreadMap[conversationId] || 0);
};

export const listConversationsForUser = async (userId: string) => {
  const myParticipations = await participantRepo().find({ where: { userId } });
  const conversationIds = myParticipations.map((p) => p.conversationId);
  if (conversationIds.length === 0) return [];

  const conversations = await conversationRepo()
    .createQueryBuilder('conversation')
    .where('conversation.id IN (:...ids)', { ids: conversationIds })
    .orderBy('conversation.lastMessageAt', 'DESC')
    .getMany();

  const allParticipants = await participantRepo().find({
    where: { conversationId: In(conversationIds) },
    relations: ['user'],
  });

  const partnerByConversation = new Map<string, User>();
  for (const participant of allParticipants) {
    if (participant.userId !== userId && participant.user) {
      partnerByConversation.set(participant.conversationId, participant.user);
    }
  }

  const unreadMap = await getUnreadCountsByConversation(conversationIds, userId);

  return conversations.map((conversation) =>
    formatConversation(
      conversation,
      partnerByConversation.get(conversation.id),
      unreadMap[conversation.id] || 0
    )
  );
};

export const getOrCreateConversation = async (
  userId: string,
  role: string,
  partnerId: string
) => {
  if (!partnerId) throw makeError('Thieu thong tin doi tac can nhan tin');
  if (partnerId === userId) throw makeError('Khong the nhan tin cho chinh minh');

  const conversationId = await runLockedTransaction(
    async (manager) => {
      // Khóa 2 user theo thứ tự ID ổn định. Mọi request tạo direct-conversation
      // cho cùng một cặp Farmer/Enterprise sẽ phải xếp hàng tại đây, tránh tạo trùng.
      const lockedUsers = await lockManyByIds(manager, User, [userId, partnerId]);
      const currentUser = lockedUsers.get(String(userId));
      const partner = lockedUsers.get(String(partnerId));

      if (!currentUser) throw makeError('Khong tim thay nguoi dung', 404);
      if (!partner) throw makeError('Khong tim thay nguoi dung doi tac', 404);

      // Không tin hoàn toàn role được truyền từ controller/token snapshot; dùng role mới nhất trong DB.
      if (currentUser.role !== role) {
        throw makeError('Vai tro nguoi dung da thay doi, vui long dang nhap lai', 401);
      }

      const validPair =
        (currentUser.role === 'farmer' && partner.role === 'enterprise') ||
        (currentUser.role === 'enterprise' && partner.role === 'farmer');
      if (!validPair) {
        throw makeError('Chi co the nhan tin truc tiep giua nong dan va doanh nghiep', 400);
      }

      const txConversationRepo = manager.getRepository(Conversation);
      const txParticipantRepo = manager.getRepository(ConversationParticipant);

      const myConversationIds = (await txParticipantRepo.find({ where: { userId } })).map(
        (p) => p.conversationId
      );

      if (myConversationIds.length > 0) {
        const existing = await txParticipantRepo.findOne({
          where: { userId: partnerId, conversationId: In(myConversationIds) },
        });
        if (existing) return existing.conversationId;
      }

      const conversation = await txConversationRepo.save(txConversationRepo.create({}));
      const now = new Date();

      await txParticipantRepo.save([
        txParticipantRepo.create({ conversationId: conversation.id, userId, joinedAt: now }),
        txParticipantRepo.create({ conversationId: conversation.id, userId: partnerId, joinedAt: now }),
      ]);

      return conversation.id;
    },
    { label: 'messaging.getOrCreateConversation' }
  );

  return buildConversationDetail(conversationId, userId);
};

export interface ListMessagesQuery {
  page?: number;
  limit?: number;
}

export const listMessagesForUser = async (
  conversationId: string,
  userId: string,
  query: ListMessagesQuery = {}
) => {
  await ensureParticipant(conversationId, userId);

  const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0
    ? Number(query.page)
    : 1;
  const limit = Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
    ? Math.min(Number(query.limit), 100)
    : 30;
  const skip = (page - 1) * limit;

  const [messages, total] = await messageRepo()
    .createQueryBuilder('message')
    .leftJoinAndSelect('message.sender', 'sender')
    .where('message.conversationId = :conversationId', { conversationId })
    .orderBy('message.createdAt', 'DESC')
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  // Dao lai thanh thu tu cu -> moi de hien thi tu tren xuong duoi trong khung chat
  messages.reverse();

  return {
    messages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const sendMessage = async (conversationId: string, userId: string, text: string) => {
  const trimmed = (text || '').trim();
  if (!trimmed) throw makeError('Noi dung tin nhan khong duoc de trong');
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw makeError(`Tin nhan qua dai (toi da ${MAX_MESSAGE_LENGTH} ky tu)`);
  }

  const messageId = await runLockedTransaction(
    async (manager) => {
      // Serialize send trong cùng conversation để LastMessage/LastMessageAt luôn khớp
      // với message vừa commit sau cùng, thay vì request chậm ghi đè request mới hơn.
      const conversation = await lockByIdOrFail(
        manager,
        Conversation,
        conversationId,
        () => makeError('Khong tim thay cuoc hoi thoai', 404)
      );

      await ensureParticipantWithManager(manager, conversationId, userId);

      const txMessageRepo = manager.getRepository(Message);
      const txReadByRepo = manager.getRepository(MessageReadBy);
      const txParticipantRepo = manager.getRepository(ConversationParticipant);
      const txNotificationRepo = manager.getRepository(Notification);
      const txUserRepo = manager.getRepository(User);
      const txConversationRepo = manager.getRepository(Conversation);

      const savedMessage = await txMessageRepo.save(
        txMessageRepo.create({ conversationId, senderId: userId, text: trimmed })
      );

      conversation.lastMessage = trimmed;
      conversation.lastMessageAt = savedMessage.createdAt;
      await txConversationRepo.save(conversation);

      await txReadByRepo.save(
        txReadByRepo.create({ messageId: savedMessage.id, userId, readAt: new Date() })
      );

      const participants = await txParticipantRepo.find({ where: { conversationId } });
      const recipients = participants.filter((p) => p.userId !== userId);

      if (recipients.length > 0) {
        const sender = await txUserRepo.findOne({ where: { id: userId } });
        const senderName = sender ? displayName(sender) : 'Doi tac';
        const preview =
          trimmed.length > NOTIFICATION_PREVIEW_LENGTH
            ? `${trimmed.slice(0, NOTIFICATION_PREVIEW_LENGTH)}...`
            : trimmed;

        await txNotificationRepo.save(
          recipients.map((recipient) =>
            txNotificationRepo.create({
              userId: recipient.userId,
              type: 'new_message',
              title: `Tin nhan moi tu ${senderName}`,
              message: preview,
              relatedId: conversationId,
              relatedModel: 'Conversation',
              severity: 'info',
              isRead: false,
              emailSent: false,
            })
          )
        );
      }

      return savedMessage.id;
    },
    { label: 'messaging.sendMessage' }
  );

  return messageRepo().findOne({
    where: { id: messageId },
    relations: ['sender'],
  });
};

export const markConversationAsRead = async (conversationId: string, userId: string) => {
  await runLockedTransaction(
    async (manager) => {
      await lockByIdOrFail(
        manager,
        Conversation,
        conversationId,
        () => makeError('Khong tim thay cuoc hoi thoai', 404)
      );
      await ensureParticipantWithManager(manager, conversationId, userId);

      const txMessageRepo = manager.getRepository(Message);
      const txReadByRepo = manager.getRepository(MessageReadBy);

      const unreadMessages = await txMessageRepo
        .createQueryBuilder('message')
        .leftJoin('message.readBy', 'readBy', 'readBy.userId = :userId', { userId })
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere('message.senderId != :userId', { userId })
        .andWhere('readBy.userId IS NULL')
        .getMany();

      if (unreadMessages.length === 0) return;

      const now = new Date();
      await txReadByRepo.save(
        unreadMessages.map((message) =>
          txReadByRepo.create({ messageId: message.id, userId, readAt: now })
        )
      );
    },
    { label: 'messaging.markConversationAsRead' }
  );
};
