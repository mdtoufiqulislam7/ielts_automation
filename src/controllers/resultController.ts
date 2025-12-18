import { Request, Response } from 'express';
import { getUserExamMarks } from '../services/resultService';

export class ResultController {
  /**
   * Get all exam marks for the authenticated user
   * Requires Bearer token in Authorization header
   */
  static async getUserMarks(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated (token decoded by middleware)
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get user_id from decoded token (req.user.id contains the userId from JWT token)
      const user_id = req.user.id; // This is the userId from the decoded token: { userId, email, username }

      // Get all exam marks for this user
      const result = await getUserExamMarks(user_id);

      res.status(200).json({
        message: 'User exam marks retrieved successfully',
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

