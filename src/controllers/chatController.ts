import { Request, Response } from 'express';
import { ChatService } from '../services/chatService';

export class ChatController {
  // Send a message
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { receiver_id, message } = req.body;

      if (!receiver_id || !message) {
        res.status(400).json({
          error: 'Receiver ID and message are required',
        });
        return;
      }

      const chatMessage = await ChatService.sendMessage(req.user.id, {
        receiver_id,
        message,
      });

      res.status(201).json({
        message: 'Message sent successfully',
        data: chatMessage,
      });
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get messages between two users
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const result = await ChatService.getMessages(
        req.user.id,
        userId,
        limit,
        offset
      );

      res.status(200).json({
        message: 'Messages retrieved successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all conversations for current user
  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await ChatService.getConversations(
        req.user.id,
        limit,
        offset
      );

      res.status(200).json({
        message: 'Conversations retrieved successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Mark messages as read
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      await ChatService.markAsRead(req.user.id, userId);

      res.status(200).json({
        message: 'Messages marked as read',
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get unread message count
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await ChatService.getUnreadCount(req.user.id);

      res.status(200).json({
        message: 'Unread count retrieved successfully',
        data: { unread_count: count },
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Check if user has unread chats (notification)
  static async hasUnreadChats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const hasUnread = await ChatService.hasUnreadChats(req.user.id);

      res.status(200).json({
        message: 'Notification status retrieved successfully',
        data: { has_unread_chats: hasUnread },
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

