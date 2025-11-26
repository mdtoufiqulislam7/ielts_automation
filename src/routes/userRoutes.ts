import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', UserController.register);
router.post('/login', UserController.login);

// Protected routes
router.get('/profile', authenticateToken, UserController.getProfile);
router.get('/users', authenticateToken, UserController.getAllUsers);
router.get('/search', authenticateToken, UserController.searchUsers);

export default router;

