import { App, LogLevel } from '@slack/bolt';
import { configureCommand, configureModal } from './configure';
import { fetchInstallation, storeInstallation } from './installation';
import { buildTipQr, getUserInfo, tipAction, tipCommand } from './tip';
import { SLACK_PORT, IS_PRODUCTION, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET, SLACK_STATE_SECRET } from "./utils/env";
import { BaseError, uncaughtExceptionHandler } from "./utils/errors";
import logger from "./utils/logger";
import express from 'express';
import { API_PORT } from './utils/env';

const app = new App({
    signingSecret: SLACK_SIGNING_SECRET,
    clientId: SLACK_CLIENT_ID,
    clientSecret: SLACK_CLIENT_SECRET,
    stateSecret: SLACK_STATE_SECRET,
    scopes: ['commands', 'chat:write', 'users:read', 'im:write', 'mpim:write', 'chat:write.public'],
    installationStore: {
        storeInstallation,
        fetchInstallation,
    },
    logLevel: IS_PRODUCTION ? LogLevel.WARN : LogLevel.DEBUG,
});

// Configure command handler
app.command('/configure', async ({ command, ack, say }) => {
    await ack();
    try {
        await say({
            text: "Configuration options:",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Use this command to configure your workspace settings."
                    }
                }
            ]
        });
    } catch (error) {
        logger.error('Error handling /configure command:', error);
    }
});

// Tip command handler
app.command('/tip', async (allArgs) => {
    const { command, ack, client, body } = allArgs;
    await ack();
    try {
        const [subcommand, ...args] = command.text.split(' ');

        const user = await getUserInfo(body.user_id);
        if (!user?.url) {
            await configureCommand(allArgs);
        } else if (subcommand === 'configure') {
            await configureCommand(allArgs);
        } else {
            await tipCommand(allArgs);
        }
    } catch (error) {
        logger.error('Error handling command:', error);
    }
});

// Add button click handler with proper typing
app.action(/qr_amount_\d+/, tipAction);

// Keep the view submission handler
app.view('configure_modal', configureModal);

// Initialize Express app
const expressApp = express();

// Define the /tip/:userId route
expressApp.get('/api/tip/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await getUserInfo(userId);
        const tipUrl = user?.url;
        if (!tipUrl) throw new BaseError('Payment URL not configured', userId);
        const qrPath = await buildTipQr(tipUrl, userId);

        // Set appropriate headers for image serving
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
        res.setHeader('Content-Disposition', 'inline');

        res.sendFile(qrPath);
    } catch (error) {
        logger.error('Error handling /tip/:userId route:', error);
        res.status(500).send('Internal server error');
    }
});

expressApp.get('/api/status', async (req, res) => {
    res.send('ok');
});

expressApp.get('/api/help', async (req, res) => {
    res.send('email braden@bradenbagby.com for help');
});

expressApp.get('/api/privacy', async (req, res) => {
    const privacyPolicy = `
Privacy Policy for Slack Tip Bot

Last Updated: ${new Date().toISOString().split('T')[0]}

1. Information We Collect
We collect and store only the following user information:
- Slack username/display name

2. How We Use Information
The collected information is used solely for the purpose of facilitating tipping functionality within Slack workspaces.

3. Data Storage and Security
We take reasonable measures to protect the limited user information we collect.

4. Data Sharing
We do not sell, trade, or otherwise transfer your information to third parties.

5. Contact
For any privacy-related questions, please contact braden@bradenbagby.com

6. Changes to Privacy Policy
We may update this privacy policy from time to time. Any changes will be reflected on this page.`;

    res.type('text').send(privacyPolicy);
});

expressApp.get('/api/tos', async (req, res) => {
    const termsOfService = `
Terms of Service for Slack Tip Bot

Last Updated: ${new Date().toISOString().split('T')[0]}

1. Acceptance of Terms
By using the Slack Tip Bot ("Service"), you agree to these Terms of Service.

2. Description of Service
Slack Tip Bot is a service that facilitates tipping between users within Slack workspaces.

3. User Responsibilities
- You agree to provide accurate information when using the Service
- You are responsible for all activities that occur under your account
- You agree not to use the Service for any illegal or unauthorized purpose

4. Data Collection
We collect and store only Slack usernames/display names as described in our Privacy Policy.

5. Service Availability
We strive to maintain Service availability but make no guarantees about continuous, uninterrupted access to the Service.

6. Limitations of Liability
The Service is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of the Service.

7. Changes to Terms
We reserve the right to modify these terms at any time. Continued use of the Service constitutes acceptance of modified terms.

8. Contact
For questions about these terms, please contact braden@bradenbagby.com

9. Termination
We reserve the right to terminate or suspend access to the Service at our discretion, without notice.`;

    res.type('text').send(termsOfService);
});

// Start the Express server
expressApp.listen(API_PORT, () => {
    logger.info(`Express app is running on port ${API_PORT}`);
});

// Start the app
(async () => {
    await app.start(SLACK_PORT);
    logger.info(`⚡️ Slack Bolt app is running on port ${SLACK_PORT}`);
})();

process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', uncaughtExceptionHandler);