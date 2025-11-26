import pool from '../config/db';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class UserService {
  // Register a new user
  static async register(data: RegisterData): Promise<RegisterResponse> {
    const { email, username, password } = data;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (email, username, password) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, username`,
      [email, username, hashedPassword]
    );

    const user = result.rows[0];

    // Generate tokens (for storage, not returned)
    const tokens = this.generateTokens(user.id, user.email, user.username);

    // Update user with refresh token (access token is not stored in DB)
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [tokens.refreshToken, user.id]
    );

    // Return only user data, no tokens
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  // Login user
  static async login(data: LoginData): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user by email
    const result = await pool.query(
      'SELECT id, email, username, password FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate new tokens
    const tokens = this.generateTokens(user.id, user.email, user.username);

    // Update user with new refresh token (access token is not stored in DB)
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [tokens.refreshToken, user.id]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // Generate JWT tokens
  private static generateTokens(
    userId: string,
    email: string,
    username: string
  ): {
    accessToken: string;
    refreshToken: string;
  } {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT secrets not configured');
    }

    // Token payload with userId, email, and username
    const tokenPayload = {
      userId,
      email,
      username,
    };

    const accessTokenOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string | number,
    } as SignOptions;

    const refreshTokenOptions = {
      expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || '15d') as string | number,
    } as SignOptions;

    const accessToken = jwt.sign(tokenPayload, jwtSecret, accessTokenOptions);
    const refreshToken = jwt.sign(
      tokenPayload,
      jwtRefreshSecret,
      refreshTokenOptions
    );

    return { accessToken, refreshToken };
  }

  // Get user by ID
  static async getUserById(userId: string) {
    const result = await pool.query(
      'SELECT id, email, username, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  // Get all users with profile information
  static async getAllUsers(currentUserId?: string, limit: number = 50, offset: number = 0) {
    if (currentUserId) {
      // Query with currentUserId - exclude current user
      const result = await pool.query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          p.bio,
          p.avatar_url,
          CASE WHEN f.follower_id IS NOT NULL THEN true ELSE false END as is_following,
          (SELECT COUNT(*) FROM followers WHERE user_id = u.id) as followers_count,
          (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN followers f ON f.user_id = u.id AND f.follower_id = $1::uuid
        WHERE u.id != $1::uuid
        ORDER BY u.created_at DESC
        LIMIT $2 OFFSET $3`,
        [currentUserId, limit, offset]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM users WHERE id != $1::uuid',
        [currentUserId]
      );
      const total = parseInt(countResult.rows[0].total);

      return {
        users: result.rows,
        total,
      };
    } else {
      // Query without currentUserId - return all users
      const result = await pool.query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          p.bio,
          p.avatar_url,
          false as is_following,
          (SELECT COUNT(*) FROM followers WHERE user_id = u.id) as followers_count,
          (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
      const total = parseInt(countResult.rows[0].total);

      return {
        users: result.rows,
        total,
      };
    }
  }
  // Search users by username or email
  static async searchUsers(
    query: string,
    currentUserId?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const searchTerm = `%${query}%`;
    
    if (currentUserId) {
      // Query with currentUserId - exclude current user
      const result = await pool.query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          p.bio,
          p.avatar_url,
          CASE WHEN f.follower_id IS NOT NULL THEN true ELSE false END as is_following,
          (SELECT COUNT(*) FROM followers WHERE user_id = u.id) as followers_count,
          (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN followers f ON f.user_id = u.id AND f.follower_id = $1::uuid
        WHERE (u.username ILIKE $2 OR u.email ILIKE $2)
          AND u.id != $1::uuid
        ORDER BY 
          CASE 
            WHEN u.username ILIKE $2 THEN 1
            WHEN u.email ILIKE $2 THEN 2
            ELSE 3
          END,
          u.created_at DESC
        LIMIT $3 OFFSET $4`,
        [currentUserId, searchTerm, limit, offset]
      );

      const countResult = await pool.query(
        `SELECT COUNT(*) as total 
         FROM users u
         WHERE (u.username ILIKE $1 OR u.email ILIKE $1)
           AND u.id != $2::uuid`,
        [searchTerm, currentUserId]
      );
      const total = parseInt(countResult.rows[0].total);

      return {
        users: result.rows,
        total,
        query,
      };
    } else {
      // Query without currentUserId - return all matching users
      const result = await pool.query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          p.bio,
          p.avatar_url,
          false as is_following,
          (SELECT COUNT(*) FROM followers WHERE user_id = u.id) as followers_count,
          (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE (u.username ILIKE $1 OR u.email ILIKE $1)
        ORDER BY 
          CASE 
            WHEN u.username ILIKE $1 THEN 1
            WHEN u.email ILIKE $1 THEN 2
            ELSE 3
          END,
          u.created_at DESC
        LIMIT $2 OFFSET $3`,
        [searchTerm, limit, offset]
      );

      const countResult = await pool.query(
        `SELECT COUNT(*) as total 
         FROM users u
         WHERE (u.username ILIKE $1 OR u.email ILIKE $1)`,
        [searchTerm]
      );
      const total = parseInt(countResult.rows[0].total);

      return {
        users: result.rows,
        total,
        query,
      };
    }
  }
}


