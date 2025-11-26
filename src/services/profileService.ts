import pool from '../config/db';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface ProfileData {
  bio?: string;
  avatar_url?: string;
}

export interface ProfileResponse {
  id: string;
  bio: string | null;
  avatar_url: string | null;
  user_id: string;
}

export class ProfileService {
  // Get profile by user ID
  static async getProfileByUserId(userId: string): Promise<ProfileResponse | null> {
    const result = await pool.query(
      'SELECT id, bio, avatar_url, user_id FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async createProfile(
    user_id: string,
    bio?: string,
    imageFile?: { buffer: Buffer; mimetype: string }
  ): Promise<ProfileResponse> {
    let avatarUrl: string | undefined;

    // If image is provided, upload it to Cloudinary
    if (imageFile) {
      avatarUrl = await this.uploadImageToCloudinary(imageFile);
    }

    // Create profile with bio and/or avatar_url
    const result = await pool.query(
      `INSERT INTO profiles (user_id, bio, avatar_url) 
       VALUES ($1, $2, $3) 
       RETURNING id, bio, avatar_url, user_id`,
      [user_id, bio || null, avatarUrl || null]
    );

    return result.rows[0];
  }


  static async getprofilebyid(user_id:string):Promise<ProfileResponse | null>{
    const result = await pool.query(`SELECT id, bio, avatar_url, user_id FROM profiles WHERE user_id = $1`, [user_id])
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  // Create or update profile
  static async createOrUpdateProfile(
    userId: string,
    data: ProfileData
  ): Promise<ProfileResponse> {
    // Check if profile exists
    const existingProfile = await this.getProfileByUserId(userId);

    if (existingProfile) {
      // Update existing profile
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.bio !== undefined) {
        updateFields.push(`bio = $${paramCount}`);
        values.push(data.bio);
        paramCount++;
      }

      if (data.avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramCount}`);
        values.push(data.avatar_url);
        paramCount++;
      }

      if (updateFields.length === 0) {
        return existingProfile;
      }

      values.push(userId);
      const result = await pool.query(
        `UPDATE profiles 
         SET ${updateFields.join(', ')} 
         WHERE user_id = $${paramCount}
         RETURNING id, bio, avatar_url, user_id`,
        values
      );

      return result.rows[0];
    } else {
      // Create new profile
      const result = await pool.query(
        `INSERT INTO profiles (user_id, bio, avatar_url) 
         VALUES ($1, $2, $3) 
         RETURNING id, bio, avatar_url, user_id`,
        [userId, data.bio || null, data.avatar_url || null]
      );

      return result.rows[0];
    }
  }

  // Upload image to Cloudinary
  static async uploadImageToCloudinary(
    file: { buffer: Buffer; mimetype: string }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ielts-profiles',
          resource_type: 'image',
          transformation: [
            { width: 500, height: 500, crop: 'limit' },
            { quality: 'auto' },
          ],
        },
        (error: any, result: any) => {
          if (error) {
            reject(new Error('Failed to upload image to Cloudinary'));
            return;
          }
          if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('No result from Cloudinary upload'));
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  // Delete image from Cloudinary
  static async deleteImageFromCloudinary(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = `ielts-profiles/${filename.split('.')[0]}`;

      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Don't throw error, just log it
    }
  }

  // Update profile with image upload
  static async updateProfileWithImage(
    userId: string,
    bio?: string,
    imageFile?: { buffer: Buffer; mimetype: string }
  ): Promise<ProfileResponse> {
    let avatarUrl: string | undefined;

    // If new image is provided, upload it
    if (imageFile) {
      // Get existing profile to delete old image
      const existingProfile = await this.getProfileByUserId(userId);
      if (existingProfile?.avatar_url) {
        await this.deleteImageFromCloudinary(existingProfile.avatar_url);
      }

      // Upload new image
      avatarUrl = await this.uploadImageToCloudinary(imageFile);
    }

    // Update or create profile
    const profileData: ProfileData = {};
    if (bio !== undefined) {
      profileData.bio = bio;
    }
    if (avatarUrl) {
      profileData.avatar_url = avatarUrl;
    }

    return await this.createOrUpdateProfile(userId, profileData);
  }
}

