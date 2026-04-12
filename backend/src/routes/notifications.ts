import { Router, Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database';
import { DeviceToken } from '../models/DeviceToken';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const deviceTokenRepo = () => AppDataSource.getRepository(DeviceToken);

const deviceTokenSchema = z.object({
  token: z.string().min(1).max(255),
  platform: z.enum(['ios']).default('ios'),
});

// Register device token
router.post('/device-token', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const parsed = deviceTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  const { token, platform } = parsed.data;
  const repo = deviceTokenRepo();

  // Upsert: reactivate if already exists
  let existing = await repo.findOneBy({ userId, token });
  if (existing) {
    existing.isActive = true;
    existing.platform = platform;
    await repo.save(existing);
    return res.json({ message: 'Device token updated' });
  }

  const deviceToken = repo.create({ userId, token, platform });
  await repo.save(deviceToken);
  return res.json({ message: 'Device token registered' });
});

// Unregister device token
router.delete('/device-token', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const parsed = deviceTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  const { token } = parsed.data;
  const repo = deviceTokenRepo();

  await repo.update({ userId, token }, { isActive: false });
  return res.json({ message: 'Device token unregistered' });
});

export default router;
