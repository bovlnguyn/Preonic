import { Request, Response } from 'express';
import {
  PUBLIC_AI_COOKIE_NAME,
  PUBLIC_AI_LIMIT,
  createPublicAiReply,
  getPublicAiCookieOptions,
  getRemainingQuestions,
  readGuestUsage,
  sanitizePublicHistory,
  sanitizePublicMessage,
  signGuestUsage,
} from '../services/ai.service';
import { asyncHandler } from '../middlewares/error.middleware';

const writeGuestCookie = (res: Response, usage: ReturnType<typeof readGuestUsage>) => {
  res.cookie(
    PUBLIC_AI_COOKIE_NAME,
    signGuestUsage(usage),
    getPublicAiCookieOptions()
  );
};

export const getPublicAiStatus = asyncHandler(async (req: Request, res: Response) => {
  const usage = readGuestUsage(req.cookies?.[PUBLIC_AI_COOKIE_NAME]);
  writeGuestCookie(res, usage);

  res.status(200).json({
    success: true,
    data: {
      limit: PUBLIC_AI_LIMIT,
      answeredCount: usage.answeredCount,
      remainingQuestions: getRemainingQuestions(usage.answeredCount),
      limitReached: usage.answeredCount >= PUBLIC_AI_LIMIT,
    },
  });
});

export const publicAiChat = asyncHandler(async (req: Request, res: Response) => {
  const usage = readGuestUsage(req.cookies?.[PUBLIC_AI_COOKIE_NAME]);
  const remainingBefore = getRemainingQuestions(usage.answeredCount);

  if (remainingBefore <= 0) {
    writeGuestCookie(res, usage);
    return res.status(200).json({
      success: true,
      data: {
        answer:
          'Phiên dùng thử dành cho khách đã kết thúc. Hãy đăng nhập để tiếp tục với PreOnic AI đầy đủ theo đúng vai trò Farmer hoặc Enterprise.',
        requiresLogin: true,
        loginReason: 'limit',
        category: 'advanced',
        limit: PUBLIC_AI_LIMIT,
        answeredCount: usage.answeredCount,
        remainingQuestions: 0,
        limitReached: true,
      },
    });
  }

  const message = sanitizePublicMessage(req.body?.message);
  const history = sanitizePublicHistory(req.body?.history);
  const reply = await createPublicAiReply(message, history);

  // Câu hỏi chuyên sâu chỉ hiển thị cổng đăng nhập, không tiêu tốn một trong
  // 20 câu trả lời cơ bản của khách.
  if (reply.requiresLogin) {
    writeGuestCookie(res, usage);
    return res.status(200).json({
      success: true,
      data: {
        ...reply,
        loginReason: 'advanced',
        limit: PUBLIC_AI_LIMIT,
        answeredCount: usage.answeredCount,
        remainingQuestions: remainingBefore,
        limitReached: false,
      },
    });
  }

  usage.answeredCount += 1;
  writeGuestCookie(res, usage);

  const remainingQuestions = getRemainingQuestions(usage.answeredCount);

  return res.status(200).json({
    success: true,
    data: {
      ...reply,
      loginReason: remainingQuestions === 0 ? 'limit' : null,
      limit: PUBLIC_AI_LIMIT,
      answeredCount: usage.answeredCount,
      remainingQuestions,
      limitReached: remainingQuestions === 0,
      showLoginAfterAnswer: remainingQuestions === 0,
    },
  });
});
