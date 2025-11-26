import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

// Send a message
router.post('/message', ChatController.sendMessage);

// Get messages between two users
router.get('/messages/:userId', ChatController.getMessages);

// Get all conversations
router.get('/conversations', ChatController.getConversations);

// Mark messages as read
router.post('/read/:userId', ChatController.markAsRead);

// Get unread message count
router.get('/unread', ChatController.getUnreadCount);

// Check if user has unread chats (notification)
router.get('/notification', ChatController.hasUnreadChats);

export default router;

