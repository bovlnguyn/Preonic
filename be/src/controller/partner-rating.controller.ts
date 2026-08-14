import { Response } from 'express';
import { AuthRequest } from '../types';
import * as partnerRatingService from '../services/partner-rating.service';
import { sendError } from '../utils/controller.util';

const formatRating = (rating: any) => ({
  id: rating.id,
  contractId: rating.contractId,
  contract: rating.contract
    ? {
        id: rating.contract.id,
        contractCode: rating.contract.contractCode,
        productName: rating.contract.productName,
        status: rating.contract.status,
      }
    : undefined,
  reviewerId: rating.reviewerId,
  reviewerRole: rating.reviewerRole,
  reviewer: rating.reviewer
    ? { id: rating.reviewer.id, fullName: rating.reviewer.fullName, role: rating.reviewer.role }
    : undefined,
  revieweeId: rating.revieweeId,
  revieweeRole: rating.revieweeRole,
  reviewee: rating.reviewee
    ? { id: rating.reviewee.id, fullName: rating.reviewee.fullName, role: rating.reviewee.role }
    : undefined,
  criteria: {
    transparency: rating.transparency,
    paymentPunctuality: rating.paymentPunctuality,
    coordination: rating.coordination,
    quality: rating.quality,
    onTimeDelivery: rating.onTimeDelivery,
    committedVolume: rating.committedVolume,
  },
  overallRating: rating.overallRating,
  comment: rating.comment,
  createdAt: rating.createdAt,
});

export const getEligiblePartners = async (req: AuthRequest, res: Response) => {
  try {
    const partners = await partnerRatingService.getEligiblePartners(
      req.user!.id,
      req.user!.role as partnerRatingService.UserRole
    );

    res.status(200).json({
      success: true,
      data: { partners },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay danh sach doi tac de danh gia that bai');
  }
};

export const createRating = async (req: AuthRequest, res: Response) => {
  try {
    const rating = await partnerRatingService.createRating(
      req.user!.id,
      req.user!.role as partnerRatingService.UserRole,
      {
        contractId: req.body.contractId,
        revieweeId: req.body.revieweeId,
        criteria: req.body.criteria,
        comment: req.body.comment,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Danh gia doi tac thanh cong',
      data: { rating: formatRating(rating) },
    });
  } catch (err: any) {
    sendError(res, err, 'Danh gia doi tac that bai');
  }
};

export const getMyRatings = async (req: AuthRequest, res: Response) => {
  try {
    const { givenRatings, receivedRatings, summary } = await partnerRatingService.getMyRatings(
      req.user!.id,
      req.user!.role as partnerRatingService.UserRole
    );

    res.status(200).json({
      success: true,
      data: {
        given: givenRatings.map(formatRating),
        received: receivedRatings.map(formatRating),
        summary,
      },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay danh sach danh gia that bai');
  }
};
