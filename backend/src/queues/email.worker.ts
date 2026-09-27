import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../config/redis';
import { getTransporter } from '../config/ethereal';
import { SlackService } from '../services/slack.service';
import { SearchService } from '../services/search.service';
import { emailQueue } from './email.queue';

const prisma = new PrismaClient();
const concurrency = Number(process.env.WORKER_CONCURRENCY) || 5;

export const emailWorker = new Worker(
  'emailQueue',
  async (job: Job) => {
    const { emailJobId, hourlyLimit, delaySeconds } = job.data;
    const emailRecord = await prisma.emailJob.findUnique({ where: { id: emailJobId } });
    if (!emailRecord || emailRecord.status === 'SENT') {
      return;
    }

    const maxPerHour = Number(hourlyLimit) || Number(process.env.DEFAULT_HOURLY_LIMIT) || 10;
    const now = new Date();
    const hourWindow = now.toISOString().slice(0, 13);
    const rateLimitKey = `rate:${emailRecord.senderEmail}:${hourWindow}`;

    // Redis atomic increment per sender per hour
    const currentCount = await redisConnection.incr(rateLimitKey);
    if (currentCount === 1) {
      await redisConnection.expire(rateLimitKey, 3600);
    }

    // Rate limit check
    if (currentCount > maxPerHour) {
      const minutesRemaining = 60 - now.getMinutes();
      const secondsRemaining = 60 - now.getSeconds();
      const delayUntilNextHour = (minutesRemaining * 60 + secondsRemaining) * 1000;

      await prisma.emailJob.update({
        where: { id: emailRecord.id },
        data: { status: 'RATE_LIMITED_RESCHEDULED' },
      });

      // Reschedule into next window without dropping
      await emailQueue.add(
        'send-email',
        job.data,
        {
          delay: delayUntilNextHour,
          jobId: `${emailJobId}-rescheduled-${Date.now()}`,
        }
      );

      // Trigger Slack alert on first breach
      if (currentCount === maxPerHour + 1) {
        await SlackService.sendRateLimitAlert(
          emailRecord.userId,
          emailRecord.senderEmail,
          currentCount,
          maxPerHour
        );
      }
      return;
    }

    // Throttling delay between sends
    const throttleMs = (Number(delaySeconds) || Number(process.env.DEFAULT_DELAY_BETWEEN_EMAILS_SEC) || 2) * 1000;
    await job.updateProgress(50);
    await new Promise((resolve) => setTimeout(resolve, throttleMs));

    try {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: emailRecord.senderEmail,
        to: emailRecord.recipientEmail,
        subject: emailRecord.subject,
        text: emailRecord.body,
        html: `<p>${emailRecord.body}</p>`,
      });

      const etherealPreviewUrl = nodemailer.getTestMessageUrl(info) || null;

      const updated = await prisma.emailJob.update({
        where: { id: emailRecord.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          etherealUrl: etherealPreviewUrl as string,
        },
      });

      await SearchService.indexEmail(updated);

      // Reset consecutive failure counter on success
      await redisConnection.set('worker:consecutive_failures', '0');
      await job.updateProgress(100);
    } catch (err: any) {
      await prisma.emailJob.update({
        where: { id: emailRecord.id },
        data: { status: 'FAILED' },
      });

      // Increment consecutive failure counter
      const failCount = await redisConnection.incr('worker:consecutive_failures');
      if (failCount >= 3) {
        console.error('🚨 Worker Circuit Breaker Tripped: Pausing queue due to 3 consecutive SMTP failures.');
        await emailQueue.pause();
        await SlackService.sendCircuitBreakerAlert(emailRecord.userId);
      }

      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency,
  }
);
