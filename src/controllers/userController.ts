import { Request, Response } from 'express';
import { UserService } from '../services/userService';

export class UserController {
  // Register a new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password } = req.body;

      // Validation
      if (!email || !username || !password) {
        res.status(400).json({
          error: 'Email, username, and password are required',
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Password validation
      if (password.length < 6) {
        res.status(400).json({
          error: 'Password must be at least 6 characters long',
        });
        return;
      }

      const authResponse = await UserService.register({
        email,
        username,
        password,
      });

      res.status(201).json({
        message: 'User registered successfully',
        data: authResponse,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({ error: error.message });
          return;
        }
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({
          error: 'Email and password are required',
        });
        return;
      }

      const authResponse = await UserService.login({ email, password });

      res.status(200).json({
        message: 'Login successful',
        data: authResponse,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('Invalid email') ||
          error.message.includes('Invalid password')
        ) {
          res.status(401).json({ error: error.message });
          return;
        }
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get current user profile (protected route)
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await UserService.getUserById(req.user.id);

      res.status(200).json({
        message: 'Profile retrieved successfully',
        data: user,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all users with profile information
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const currentUserId = req.user?.id;

      const result = await UserService.getAllUsers(currentUserId, limit, offset);

      res.status(200).json({
        message: 'Users retrieved successfully',
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

  // Search users by username or email
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const currentUserId = req.user?.id;

      if (!query || query.trim().length === 0) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      if (query.trim().length < 2) {
        res.status(400).json({ error: 'Search query must be at least 2 characters' });
        return;
      }

      const result = await UserService.searchUsers(
        query.trim(),
        currentUserId,
        limit,
        offset
      );

      res.status(200).json({
        message: 'Users found successfully',
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
}

