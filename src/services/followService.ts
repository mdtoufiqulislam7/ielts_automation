import pool from '../config/db';
import { WebSocketServer } from '../config/websocket';

export interface FollowResponse {
  user_id: string;
  follower_id: string;
  created_at: Date;
}

export class FollowService {
  // Follow a user
  static async followUser(followerId: string, userId: string): Promise<FollowResponse> {
    // Check if already following
    const existing = await pool.query(
      'SELECT id FROM followers WHERE user_id = $1 AND follower_id = $2',
      [userId, followerId]
    );

    if (existing.rows.length > 0) {
      throw new Error('Already following this user');
    }

    // Check if trying to follow self
    if (followerId === userId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }

    // Insert follow relationship
    const result = await pool.query(
      `INSERT INTO followers (user_id, follower_id)
       VALUES ($1, $2)
       RETURNING user_id, follower_id, created_at`,
      [userId, followerId]
    );

    // Emit WebSocket event for real-time update
    const wsServer = WebSocketServer.getInstance();
    if (wsServer) {
      // Get follower username
      const followerResult = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [followerId]
      );
      const followerUsername = followerResult.rows[0]?.username || 'Unknown';

      // Notify the followed user
      wsServer.emitToUser(userId, 'new_follower', {
        followerId,
        followerUsername,
        timestamp: new Date(),
      });

      // Notify the follower
      wsServer.emitToUser(followerId, 'follow_success', {
        userId,
        timestamp: new Date(),
      });
    }

    return result.rows[0];
  }

  // Unfollow a user
  static async unfollowUser(followerId: string, userId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM followers WHERE user_id = $1 AND follower_id = $2 RETURNING id',
      [userId, followerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Not following this user');
    }

    // Emit WebSocket event for real-time update
    const wsServer = WebSocketServer.getInstance();
    if (wsServer) {
      // Get follower username
      const followerResult = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [followerId]
      );
      const followerUsername = followerResult.rows[0]?.username || 'Unknown';

      // Notify the unfollowed user
      wsServer.emitToUser(userId, 'user_unfollowed', {
        followerId,
        followerUsername,
        timestamp: new Date(),
      });

      // Notify the unfollower
      wsServer.emitToUser(followerId, 'unfollow_success', {
        userId,
        timestamp: new Date(),
      });
    }
  }

  // Get followers of a user
  static async getFollowers(userId: string, limit: number = 50, offset: number = 0) {
    const result = await pool.query(
      `SELECT 
        f.follower_id as id,
        u.username,
        u.email,
        p.avatar_url,
        p.bio,
        f.created_at as followed_at
      FROM followers f
      INNER JOIN users u ON f.follower_id = u.id
      LEFT JOIN profiles p ON f.follower_id = p.user_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC NULLS LAST
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM followers WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total);

    return {
      followers: result.rows,
      total,
    };
  }

  // Get users that a user is following
  static async getFollowing(userId: string, limit: number = 50, offset: number = 0) {
    const result = await pool.query(
      `SELECT 
        f.user_id as id,
        u.username,
        u.email,
        p.avatar_url,
        p.bio,
        f.created_at as followed_at
      FROM followers f
      INNER JOIN users u ON f.user_id = u.id
      LEFT JOIN profiles p ON f.user_id = p.user_id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC NULLS LAST
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM followers WHERE follower_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total);

    return {
      following: result.rows,
      total,
    };
  }

  // Check if user is following another user
  static async isFollowing(followerId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM followers WHERE user_id = $1 AND follower_id = $2',
      [userId, followerId]
    );

    return result.rows.length > 0;
  }
}

