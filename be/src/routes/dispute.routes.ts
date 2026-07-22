import { Router, RequestHandler } from 'express';
import {
  createDispute,
  getDispute,
  listDisputes,
} from '../controller/dispute.controller';
import { protect } from '../middlewares/auth.middlewares';
import { uploadDisputeFiles } from '../middlewares/uploads.middlewares';

const router = Router();

router.get(
  '/',
  protect as RequestHandler,
  listDisputes as RequestHandler
);

router.get(
  '/:id',
  protect as RequestHandler,
  getDispute as RequestHandler
);

router.post(
  '/',
  protect as RequestHandler,
  uploadDisputeFiles as RequestHandler,
  createDispute as RequestHandler
);

export default router;