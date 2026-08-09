import { Router, RequestHandler } from 'express';
import {
  createDispute,
  getDispute,
  listDisputes,
} from '../controller/dispute.controller';
import { protect } from '../middlewares/auth.middlewares';
import { uploadDisputeFiles } from '../middlewares/uploads.middlewares';
import {
  validateCreateDispute,
  validateDisputeIdParam,
  validateListDisputes,
} from '../middlewares/validation';

const router = Router();

router.get(
  '/',
  protect as RequestHandler,
  validateListDisputes as RequestHandler[],
  listDisputes as RequestHandler
);

router.get(
  '/:id',
  protect as RequestHandler,
  validateDisputeIdParam as RequestHandler[],
  getDispute as RequestHandler
);

router.post(
  '/',
  protect as RequestHandler,
  uploadDisputeFiles as RequestHandler,
  validateCreateDispute as RequestHandler[],
  createDispute as RequestHandler
);

export default router;