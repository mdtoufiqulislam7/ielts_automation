import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// All profile routes require authentication
router.use(authenticateToken);

// Create profile (with optional bio and/or avatar)
router.post('/', upload.single('avatar'), ProfileController.createProfile);

// Get profile by ID
router.get('/:id', ProfileController.getprofilebyid);

// Get profile
router.get('/', ProfileController.getProfile);

// Update profile (bio and/or avatar)
router.put('/', upload.single('avatar'), ProfileController.updateProfile);

// Update bio only
router.patch('/bio', ProfileController.updateBio);

// Upload avatar only
router.post('/avatar', upload.single('avatar'), ProfileController.uploadAvatar);

export default router;

