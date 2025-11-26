import pool from '../config/db';

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  email: string;
  total_mark: number;
  avatar_url: string | null;
  rank: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
}

export class LeaderboardService {
  // Get leaderboard with user details
  static async getLeaderboard(limit: number = 100, offset: number = 0): Promise<LeaderboardResponse> {
    const result = await pool.query(
      `SELECT 
        l.user_id,
        u.username,
        u.email,
        l.total_mark,
        p.avatar_url,
        ROW_NUMBER() OVER (ORDER BY l.total_mark DESC) as rank
      FROM leaderboard l
      INNER JOIN users u ON l.user_id = u.id
      LEFT JOIN profiles p ON l.user_id = p.user_id
      ORDER BY l.total_mark DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM leaderboard');
    const total = parseInt(countResult.rows[0].total);

    return {
      leaderboard: result.rows.map((row) => ({
        user_id: row.user_id,
        username: row.username,
        email: row.email,
        total_mark: parseFloat(row.total_mark) || 0,
        avatar_url: row.avatar_url,
        rank: parseInt(row.rank),
      })),
      total,
    };
  }

  // Get user's rank and position
  static async getUserRank(userId: string): Promise<{
    rank: number;
    total_mark: number;
    total_users: number;
  } | null> {
    const result = await pool.query(
      `SELECT 
        l.user_id,
        l.total_mark,
        ROW_NUMBER() OVER (ORDER BY l.total_mark DESC) as rank,
        (SELECT COUNT(*) FROM leaderboard) as total_users
      FROM leaderboard l
      WHERE l.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      rank: parseInt(result.rows[0].rank),
      total_mark: parseFloat(result.rows[0].total_mark) || 0,
      total_users: parseInt(result.rows[0].total_users),
    };
  }

  // Update or create leaderboard entry
  static async updateLeaderboard(userId: string, totalMark: number): Promise<void> {
    await pool.query(
      `INSERT INTO leaderboard (user_id, total_mark)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET total_mark = $2`,
      [userId, totalMark]
    );
  }
}

