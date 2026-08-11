import { Response } from 'express';
import { AuthRequest } from '../types';
import * as messagingService from '../services/messaging.service';
import { sendError } from '../utils/controller.util';

const formatMessage = (message: any) => ({
  id: message.id,
  conversationId: message.conversationId,
  text: message.text,
  createdAt: message.createdAt,
  sender: message.sender
    ? {
        id: message.sender.id,
        name:
          message.sender.fullName ||
          `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim() ||
          message.sender.email,
        role: message.sender.role,
        avatar: message.sender.avatar,
      }
    : { id: message.senderId },
});

export const listConversations = async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await messagingService.listConversationsForUser(req.user!.id);

    res.status(200).json({
      success: true,
      data: { conversations },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay danh sach hoi thoai that bai');
  }
};

export const startConversation = async (req: AuthRequest, res: Response) => {
  try {
    const conversation = await messagingService.getOrCreateConversation(
      req.user!.id,
      req.user!.role,
      req.body?.partnerId
    );

    res.status(200).json({
      success: true,
      data: { conversation },
    });
  } catch (err: any) {
    sendError(res, err, 'Tao hoi thoai that bai');
  }
};

export const listMessages = async (req: AuthRequest, res: Response) => {
  try {
    const result = await messagingService.listMessagesForUser(
      req.params.id,
      req.user!.id,
      {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        messages: result.messages.map(formatMessage),
        pagination: result.pagination,
      },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay tin nhan that bai');
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const message = await messagingService.sendMessage(
      req.params.id,
      req.user!.id,
      req.body?.text
    );

    res.status(201).json({
      success: true,
      message: 'Gui tin nhan thanh cong',
      data: { message: formatMessage(message) },
    });
  } catch (err: any) {
    sendError(res, err, 'Gui tin nhan that bai');
  }
};

export const markConversationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await messagingService.markConversationAsRead(req.params.id, req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Da danh dau hoi thoai la da doc',
    });
  } catch (err: any) {
    sendError(res, err, 'Danh dau hoi thoai that bai');
  }
};
