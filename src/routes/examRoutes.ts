import { Router } from 'express';
import { ExamController } from '../controllers/examController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes (get exams)
router.get('/', ExamController.getAllExams);
router.get('/:id', ExamController.getExam);

// Protected routes (require authentication)
router.use(authenticateToken);

// Create exam
router.post('/', ExamController.createExam);

// User exam routes
router.post('/start', ExamController.startExam);
router.post('/submit-answer', ExamController.submitAnswer);
router.post('/complete', ExamController.completeExam);
router.get('/user/my-exams', ExamController.getUserExams);
router.get('/user/:id', ExamController.getUserExam);

export default router;

