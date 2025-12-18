import { Router } from 'express';
import { ResultController } from '../controllers/resultController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All result routes require authentication
router.use(authenticateToken);

// Get all exam marks for authenticated user
router.get('/marks', ResultController.getUserMarks);

export default router;

