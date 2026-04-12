import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import appleSignin from 'apple-signin-auth';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

const router = Router();
const userRepo = () => AppDataSource.getRepository(User);

// --- Zod schemas ---

const appleSchema = z.object({
  identityToken: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

const googleSchema = z.object({
  idToken: z.string().min(1),
});

// --- Helpers ---

async function findOrCreateUser(
  provider: 'apple' | 'google',
  providerUserId: string,
  email?: string | null,
  name?: string | null,
): Promise<User> {
  const repo = userRepo();
  let user = await repo.findOneBy({ provider, providerUserId });

  if (user) {
    // Update name/email only if not already set
    let updated = false;
    if (!user.name && name) { user.name = name; updated = true; }
    if (!user.email && email) { user.email = email; updated = true; }
    if (updated) await repo.save(user);
    return user;
  }

  user = repo.create({
    provider,
    providerUserId,
    email: email ?? null,
    name: name ?? null,
  });
  return repo.save(user);
}

function signJwt(user: User): string {
  return jwt.sign(
    { userId: user.id, provider: user.provider },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' },
  );
}

function userResponse(token: string, user: User) {
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
    },
  };
}

// --- Routes ---

router.post('/apple', async (req: Request, res: Response) => {
  const parsed = appleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  const { identityToken, name, email } = parsed.data;

  try {
    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_BUNDLE_ID!,
      ignoreExpiration: false,
    });

    const sub = payload.sub;
    const user = await findOrCreateUser('apple', sub, email ?? payload.email, name);
    const token = signJwt(user);

    return res.json(userResponse(token, user));
  } catch (err) {
    console.error('Apple auth error:', err);
    return res.status(401).json({ error: 'Invalid Apple identity token' });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  const { idToken } = parsed.data;

  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Invalid Google token payload' });
    }

    const user = await findOrCreateUser('google', payload.sub, payload.email, payload.name);
    const token = signJwt(user);

    return res.json(userResponse(token, user));
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(401).json({ error: 'Invalid Google ID token' });
  }
});

export default router;
