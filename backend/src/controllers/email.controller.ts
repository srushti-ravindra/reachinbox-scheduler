import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { emailQueue } from '../queues/email.queue';
import { SearchService } from '../services/search.service';
import { lintEmailContent } from '../utils/deliverabilityLinter';

const prisma = new PrismaClient();
const inMemoryJobs: any[] = [];

export const lintEmail = async (req: Request, res: Response) => {
  try {
    const { subject, body } = req.body;
    const lintReport = lintEmailContent(subject || '', body || '');
    res.json(lintReport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const scheduleEmails = async (req: Request, res: Response) => {
  const { userId, senderEmail, recipients, subject, body, startTime, delaySeconds, hourlyLimit, force } = req.body;

  if (!userId || !recipients || !recipients.length || !subject || !body || !startTime) {
    return res.status(400).json({ error: 'Missing required scheduling payload fields' });
  }

  // Deliverability Quality Gate pre-flight check
  const lintReport = lintEmailContent(subject, body);
  if (!force && lintReport.score < 70) {
    return res.status(422).json({
      error: 'Deliverability Quality Gate warning: Content score is below safety threshold (70).',
      lintReport,
    });
  }

  const startTimestamp = new Date(startTime).getTime();
  const scheduledJobs = [];

  // Ensure user record exists in Prisma DB if database is connected
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: senderEmail },
      create: { id: userId, email: senderEmail, name: senderEmail.split('@')[0] },
    });
  } catch (e: any) {
    console.warn('Prisma user sync notice:', e.message);
  }

  for (const recipient of recipients) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fallbackJob = {
      id: jobId,
      userId,
      senderEmail,
      recipientEmail: recipient.trim(),
      subject,
      body,
      delaySeconds: Number(delaySeconds) || 2,
      hourlyLimit: Number(hourlyLimit) || 10,
      scheduledFor: new Date(startTime),
      status: 'SCHEDULED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let createdRecord = null;
    try {
      createdRecord = await prisma.emailJob.create({
        data: {
          id: jobId,
          userId,
          senderEmail,
          recipientEmail: recipient.trim(),
          subject,
          body,
          delaySeconds: Number(delaySeconds) || 2,
          hourlyLimit: Number(hourlyLimit) || 10,
          scheduledFor: new Date(startTime),
          status: 'SCHEDULED',
        },
      });
    } catch (e: any) {
      console.warn('Prisma create emailJob fallback:', e.message);
      createdRecord = fallbackJob;
      inMemoryJobs.push(fallbackJob);
    }

    try {
      const delay = Math.max(0, startTimestamp - Date.now());
      const addPromise = emailQueue.add(
        'send-email',
        {
          emailJobId: createdRecord.id,
          hourlyLimit: Number(hourlyLimit) || 10,
          delaySeconds: Number(delaySeconds) || 2,
        },
        {
          delay,
          jobId: createdRecord.id,
        }
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Queue timeout (Redis offline)')), 1000)
      );
      await Promise.race([addPromise, timeoutPromise]);
    } catch (e: any) {
      console.warn('BullMQ add queue fallback:', e.message);
    }

    try {
      await SearchService.indexEmail(createdRecord);
    } catch (e: any) {
      console.warn('Search index fallback:', e.message);
    }

    scheduledJobs.push(createdRecord);
  }

  return res.status(201).json({ count: scheduledJobs.length, scheduledJobs, lintReport });
};

export const getScheduledEmails = async (req: Request, res: Response) => {
  const { userId } = req.query;
  try {
    const dbPromise = prisma.emailJob.findMany({
      where: {
        userId: String(userId),
        status: { in: ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED'] },
      },
      orderBy: { scheduledFor: 'asc' },
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Prisma timeout')), 500)
    );
    const dbEmails = await Promise.race([dbPromise, timeoutPromise]);
    const memEmails = inMemoryJobs.filter(
      (j) => j.userId === String(userId) && ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED'].includes(j.status)
    );
    res.json([...dbEmails, ...memEmails]);
  } catch (err: any) {
    const memEmails = inMemoryJobs.filter(
      (j) => j.userId === String(userId) && ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED'].includes(j.status)
    );
    res.json(memEmails);
  }
};

export const getSentEmails = async (req: Request, res: Response) => {
  const { userId } = req.query;
  try {
    const dbPromise = prisma.emailJob.findMany({
      where: {
        userId: String(userId),
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { sentAt: 'desc' },
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Prisma timeout')), 500)
    );
    const dbEmails = await Promise.race([dbPromise, timeoutPromise]);
    const memEmails = inMemoryJobs.filter(
      (j) => j.userId === String(userId) && ['SENT', 'FAILED'].includes(j.status)
    );
    res.json([...dbEmails, ...memEmails]);
  } catch (err: any) {
    const memEmails = inMemoryJobs.filter(
      (j) => j.userId === String(userId) && ['SENT', 'FAILED'].includes(j.status)
    );
    res.json(memEmails);
  }
};

export const searchEmails = async (req: Request, res: Response) => {
  const { userId, q, status } = req.query;
  try {
    const results = await SearchService.searchEmails(String(userId), String(q || ''), status ? String(status) : undefined);
    res.json(results);
  } catch (err: any) {
    res.json([]);
  }
};
