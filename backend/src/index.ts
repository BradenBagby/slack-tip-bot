import { App, LogLevel } from '@slack/bolt';
import { configureCommand, configureModal } from './configure';
import { fetchInstallation, storeInstallation } from './installation';
import { tipAction, tipCommand } from './tip';
import { API_PORT, IS_PRODUCTION, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET, SLACK_STATE_SECRET } from "./utils/env";
import { uncaughtExceptionHandler } from "./utils/errors";
import logger from "./utils/logger";

const app = new App({
    signingSecret: SLACK_SIGNING_SECRET,
    clientId: SLACK_CLIENT_ID,
    clientSecret: SLACK_CLIENT_SECRET,
    stateSecret: SLACK_STATE_SECRET,
    scopes: ['commands', 'chat:write', 'users:read', 'files:write'],
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

        if (subcommand === 'configure') {
            await configureCommand(allArgs);
        } else {
            await tipCommand(allArgs);
        }
    } catch (error) {
        logger.error('Error handling /tip command:', error);
    }
});

// Add button click handler with proper typing
app.action(/qr_amount_\d+/, tipAction);




// Keep the view submission handler
app.view('configure_modal', configureModal);

// Start the app
(async () => {
    await app.start(API_PORT);
    logger.info(`⚡️ Slack Bolt app is running on port ${API_PORT}`);
})();

process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', uncaughtExceptionHandler);