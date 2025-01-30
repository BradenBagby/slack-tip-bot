import { App, LogLevel } from '@slack/bolt';
import { fetchInstallation, storeInstallation } from './installation';
import { API_PORT, IS_PRODUCTION, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET, SLACK_STATE_SECRET } from "./utils/env";
import { BaseError, uncaughtExceptionHandler } from "./utils/errors";
import logger from "./utils/logger";
import prisma from './prisma';

console.log('IS_PRODUCTION', SLACK_SIGNING_SECRET);

const app = new App({
    signingSecret: SLACK_SIGNING_SECRET,
    clientId: SLACK_CLIENT_ID,
    clientSecret: SLACK_CLIENT_SECRET,
    stateSecret: SLACK_STATE_SECRET,
    scopes: ['commands', 'chat:write', 'users:read'],
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
app.command('/tip', async ({ command, ack, client, body }) => {
    await ack();
    try {
        const [subcommand, ...args] = command.text.split(' ');

        if (subcommand === 'configure') {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'configure_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Configure Tips'
                    },
                    blocks: [
                        {
                            type: 'input',
                            block_id: 'url_input',
                            element: {
                                type: 'url_text_input',
                                action_id: 'url',
                                placeholder: {
                                    type: 'plain_text',
                                    text: 'Enter your URL'
                                }
                            },
                            label: {
                                type: 'plain_text',
                                text: 'URL'
                            }
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Save'
                    }
                }
            });
        } else {
            // Handle regular tip command or show help
            await client.chat.postMessage({
                channel: command.channel_id,
                text: "Available commands:\n• `/tip configure` - Set up your tipping URL\n• `/tip @user <amount>` - Send a tip"
            });
        }
    } catch (error) {
        logger.error('Error handling /tip command:', error);
    }
});

// Keep the view submission handler
app.view('configure_modal', async ({ ack, view, body, client }) => {
    // Acknowledge the view submission immediately
    await ack();
    try {
        const url = view.state.values.url_input.url.value;
        const teamId = body.team?.id;
        const userId = body.user.id;

        if (!teamId) {
            throw new Error('Team ID not found');
        }

        // Save URL for this specific user
        await prisma.userConfiguration.upsert({
            where: {
                userId_teamId: {
                    userId: userId,
                    teamId: teamId,
                }
            },
            update: {
                url: url,
            },
            create: {
                userId: userId,
                teamId: teamId,
                url: url,
            },
        });

        // Send confirmation message in DM instead of response
        await client.chat.postMessage({
            channel: userId,
            text: `Configuration saved! URL: ${url}`
        });
    } catch (error) {
        logger.error('Error handling configure modal submission:', error);
        // Send error message to user
        await client.chat.postMessage({
            channel: body.user.id,
            text: "Sorry, there was an error saving your configuration."
        });
    }
});

// Start the app
(async () => {
    await app.start(API_PORT);
    logger.info(`⚡️ Slack Bolt app is running on port ${API_PORT}`);
})();

process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', uncaughtExceptionHandler);