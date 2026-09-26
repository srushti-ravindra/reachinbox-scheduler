import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SlackService {
  static async sendRateLimitAlert(userId: string, senderEmail: string, count: number, limit: number) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.slackWebhookUrl) {
        console.log(`Slack alert bypassed: No active webhook for user ${userId}`);
        return;
      }

      await axios.post(user.slackWebhookUrl, {
        text: `🚨 Rate Limit Alert: Sender ${senderEmail} reached the hourly threshold!`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ ReachInbox Rate Limit Triggered',
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Sender:*\n${senderEmail}` },
              { type: 'mrkdwn', text: `*Limit:*\n${limit} emails/hour` },
              { type: 'mrkdwn', text: `*Current Counter:*\n${count}` },
              { type: 'mrkdwn', text: `*Resolution:*\nRemaining jobs rescheduled to next hour window` },
            ],
          },
        ],
      });
      console.log(`Slack notification sent to user ${userId}`);
    } catch (error) {
      console.error('Failed to dispatch Slack rate limit notification:', error);
    }
  }

  static async sendCircuitBreakerAlert(userId: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.slackWebhookUrl) {
        console.log(`Slack alert bypassed: No active webhook for user ${userId}`);
        return;
      }

      await axios.post(user.slackWebhookUrl, {
        text: '🚨 Worker Circuit Breaker Tripped: Queue halted to prevent reputation degradation.',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⛔ Worker Circuit Breaker Tripped',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Status:* Queue halted to prevent reputation degradation due to 3 consecutive SMTP failures.',
            },
          },
        ],
      });
      console.log(`Slack circuit breaker notification sent to user ${userId}`);
    } catch (error) {
      console.error('Failed to dispatch Slack circuit breaker notification:', error);
    }
  }
}
