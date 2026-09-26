import { Request, Response } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authorizeSlack = (req: Request, res: Response) => {
  const { userId } = req.query;
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.SLACK_REDIRECT_URI || '');
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=incoming-webhook,chat:write&redirect_uri=${redirectUri}&state=${userId}`;
  res.redirect(slackAuthUrl);
};

export const slackCallback = async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;
  try {
    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      null,
      {
        params: {
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code,
          redirect_uri: process.env.SLACK_REDIRECT_URI,
        },
      }
    );

    if (response.data.ok) {
      const webhookUrl = response.data.incoming_webhook?.url;
      const accessToken = response.data.access_token;

      await prisma.user.update({
        where: { id: String(userId) },
        data: {
          slackWebhookUrl: webhookUrl,
          slackAccessToken: accessToken,
        },
      });
      res.redirect(`${process.env.FRONTEND_URL}?slack_connected=true`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}?slack_error=oauth_failed`);
    }
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}?slack_error=server_error`);
  }
};
