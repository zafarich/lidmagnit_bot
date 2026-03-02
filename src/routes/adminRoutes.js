import { Router } from 'express';
import adminAuth from '../middleware/adminAuth.js';
import { checkAdmin, sendBroadcast, upload } from '../controllers/broadcastController.js';

const router = Router();

router.get('/check/:telegramId', checkAdmin);
router.post('/broadcast', adminAuth, upload.single('photo'), sendBroadcast);

export default router;
