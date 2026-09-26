import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const loginOrRegister = async (req: Request, res: Response) => {
  const { email, name, avatar } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: name || 'User', avatar: avatar || '' },
      create: { email, name: name || 'User', avatar: avatar || '' },
    });
    return res.json(user);
  } catch (error: any) {
    console.warn('Database auth fallback active:', error.message);
    const fallbackUser = {
      id: 'usr_' + Buffer.from(email).toString('hex').slice(0, 16),
      email,
      name: name || email.split('@')[0],
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      slackWebhookUrl: null,
      slackAccessToken: null,
      createdAt: new Date().toISOString(),
    };
    return res.json(fallbackUser);
  }
};
