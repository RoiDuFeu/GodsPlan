import { Router, Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database';
import { UserPreferences } from '../models/UserPreferences';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prefsRepo = () => AppDataSource.getRepository(UserPreferences);

const updateSchema = z.object({
  subscribedChurches: z.array(z.string().uuid()).optional(),
  language: z.enum(['fr', 'en']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// Get preferences
router.get('/', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const repo = prefsRepo();

  let prefs = await repo.findOneBy({ userId });
  if (!prefs) {
    // Return defaults without persisting
    return res.json({
      subscribedChurches: [],
      language: 'fr',
      theme: 'system',
      reminderEnabled: false,
      reminderTime: '07:00',
    });
  }

  return res.json({
    subscribedChurches: prefs.subscribedChurches,
    language: prefs.language,
    theme: prefs.theme,
    reminderEnabled: prefs.reminderEnabled,
    reminderTime: prefs.reminderTime,
  });
});

// Upsert preferences (partial update)
router.put('/', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  const repo = prefsRepo();
  let prefs = await repo.findOneBy({ userId });

  if (!prefs) {
    prefs = repo.create({ userId, ...parsed.data });
  } else {
    Object.assign(prefs, parsed.data);
  }

  await repo.save(prefs);

  return res.json({
    subscribedChurches: prefs.subscribedChurches,
    language: prefs.language,
    theme: prefs.theme,
    reminderEnabled: prefs.reminderEnabled,
    reminderTime: prefs.reminderTime,
  });
});

export default router;
