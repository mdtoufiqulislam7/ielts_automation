import { Request, Response } from 'express';
import { ProfileService } from '../services/profileService';

export class ProfileController {
  // Get current user's profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await ProfileService.getProfileByUserId(req.user.id);

      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      res.status(200).json({
        message: 'Profile retrieved successfully',
        data: profile,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }


  static async createProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { bio } = req.body;
      const imageFile = req.file;

      const profile = await ProfileService.createProfile(
        req.user.id,
        bio,
        imageFile
      );

      res.status(201).json({
        message: 'Profile created successfully',
        data: profile,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  static async getprofilebyid(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const profile = await ProfileService.getprofilebyid(req.user.id);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      res.status(200).json({
        message: 'Profile retrieved successfully',
        data: profile,
      });
    }
    catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update profile (bio and/or avatar)
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { bio } = req.body;
      const imageFile = req.file;

      // Validate that at least one field is provided
      if (!bio && !imageFile) {
        res.status(400).json({
          error: 'At least one field (bio or avatar) must be provided',
        });
        return;
      }

      const profile = await ProfileService.updateProfileWithImage(
        req.user.id,
        bio,
        imageFile
      );

      res.status(200).json({
        message: 'Profile updated successfully',
        data: profile,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update only bio
  static async updateBio(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { bio } = req.body;

      if (!bio) {
        res.status(400).json({ error: 'Bio is required' });
        return;
      }

      const profile = await ProfileService.createOrUpdateProfile(req.user.id, {
        bio,
      });

      res.status(200).json({
        message: 'Bio updated successfully',
        data: profile,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Upload avatar only
  static async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Image file is required' });
        return;
      }

      const profile = await ProfileService.updateProfileWithImage(
        req.user.id,
        undefined,
        req.file
      );

      res.status(200).json({
        message: 'Avatar uploaded successfully',
        data: profile,
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

