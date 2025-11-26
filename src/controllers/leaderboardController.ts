import { Request, Response } from 'express';
import { LeaderboardService } from '../services/leaderboardService';

export class LeaderboardController {
  // Get leaderboard
  static async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const leaderboard = await LeaderboardService.getLeaderboard(limit, offset);

      res.status(200).json({
        message: 'Leaderboard retrieved successfully',
        data: leaderboard,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get current user's rank
  static async getMyRank(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userRank = await LeaderboardService.getUserRank(req.user.id);

      if (!userRank) {
        res.status(404).json({ error: 'User not found in leaderboard' });
        return;
      }

      res.status(200).json({
        message: 'Rank retrieved successfully',
        data: userRank,
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

