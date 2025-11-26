import { Router } from 'express';
import { FollowController } from '../controllers/followController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All follow routes require authentication
router.use(authenticateToken);

// Follow a user
router.post('/:userId', FollowController.followUser);

// Unfollow a user
router.delete('/:userId', FollowController.unfollowUser);

// Check if following a user
router.get('/:userId/check', FollowController.checkFollowing);

// Get followers of a user (public)
router.get('/:userId/followers', FollowController.getFollowers);

// Get users that a user is following (public)
router.get('/:userId/following', FollowController.getFollowing);

export default router;

