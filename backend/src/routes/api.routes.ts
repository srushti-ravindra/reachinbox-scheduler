import { Router } from 'express';
import { loginOrRegister } from '../controllers/auth.controller';
import { authorizeSlack, slackCallback } from '../controllers/slack.controller';
import { scheduleEmails, getScheduledEmails, getSentEmails, searchEmails, lintEmail } from '../controllers/email.controller';

const router = Router();

router.post('/auth/login', loginOrRegister);
router.get('/slack/authorize', authorizeSlack);
router.get('/slack/install', authorizeSlack);
router.get('/slack/callback', slackCallback);

router.post('/emails/lint', lintEmail);
router.post('/emails/schedule', scheduleEmails);
router.get('/emails/scheduled', getScheduledEmails);
router.get('/emails/sent', getSentEmails);
router.get('/emails/search', searchEmails);

export default router;
