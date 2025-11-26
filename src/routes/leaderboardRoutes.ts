import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get leaderboard (public endpoint)
router.get('/', LeaderboardController.getLeaderboard);

// Get my rank (requires authentication)
router.get('/my-rank', authenticateToken, LeaderboardController.getMyRank);

export default router;

