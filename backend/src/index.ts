import { App, LogLevel } from '@slack/bolt';
import { fetchInstallation, storeInstallation } from './installation';
import { API_PORT, IS_PRODUCTION, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET, SLACK_STATE_SECRET } from "./utils/env";
import { BaseError, uncaughtExceptionHandler } from "./utils/errors";
import logger from "./utils/logger";
import prisma from './prisma';
import { configureCommand, configureModal } from './configure';
import QRCode from 'qrcode';
import { BlockElementAction } from '@slack/bolt';

console.log('IS_PRODUCTION', SLACK_SIGNING_SECRET);

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
        } else if (subcommand === 'request') {


            const userId = command.user_id;
            if (!userId) throw new BaseError('User ID not found', command);



            const tipUrl = await getTipUrl(userId);
            if (!tipUrl) {
                await client.chat.postMessage({
                    channel: command.channel_id,
                    text: "Please configure your payment URL first using `/tip configure`"
                });
                return;
            }

            // Send message with amount buttons
            await client.chat.postMessage({
                channel: command.channel_id,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "Select an amount to generate a QR code:"
                        }
                    },
                    {
                        type: "actions",
                        block_id: "qr_amount_selection",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "$1",
                                    emoji: true
                                },
                                value: "1",
                                action_id: "qr_amount_1"
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "$5",
                                    emoji: true
                                },
                                value: "5",
                                action_id: "qr_amount_5"
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "$10",
                                    emoji: true
                                },
                                value: "10",
                                action_id: "qr_amount_10"
                            }
                        ]
                    }
                ]
            });
        } else {
            // Handle regular tip command or show help
            await client.chat.postMessage({
                channel: command.channel_id,
                text: "Available commands:\n• `/tip configure` - Set up your tipping URL\n• `/tip @user <amount>` - Send a tip" // TODO: change
            });
        }
    } catch (error) {
        logger.error('Error handling /tip command:', error);
    }
});

// Add button click handler with proper typing
app.action(/qr_amount_\d+/, async ({ body, ack, client, action }) => {
    const buttonAction = action as BlockElementAction;  // Type assertion
    await ack();
    try {
        const amount = buttonAction.action_id.split('_')[2];
        const tipUrl = await getTipUrl(body.user.id);
        if (!body.channel?.id) throw new BaseError('Channel ID not found', body);

        if (!tipUrl) {
            await client.chat.postEphemeral({
                channel: body.channel.id,
                user: body.user.id,
                text: "Error: Payment URL not configured"
            });
            return;
        }

        // Generate payment URL with amount
        const paymentUrl = tipUrl; // TODO: 

        // Generate QR code
        const qrBuffer = await QRCode.toBuffer(paymentUrl);

        // Upload QR code to Slack
        const result = await client.files.uploadV2({
            channels: body.channel.id,
            file: qrBuffer,
            filename: `payment-qr-${amount}.png`,
            initial_comment: `QR Code for $${amount} payment`
        });

        if (!result.ok) throw new BaseError('Failed to upload QR code', result);

    } catch (error) {
        logger.error('Error handling QR code generation:', error);
        if (body.channel?.id)
            await client.chat.postEphemeral({
                channel: body.channel.id,
                user: body.user.id,
                text: "Error generating QR code"
            });
    }
});


const getTipUrl = async (userId: string) => {
    const userConfig = await prisma.userConfiguration.findFirst({
        where: { userId: userId }
    });
    return userConfig?.url;
}

// Keep the view submission handler
app.view('configure_modal', configureModal);

// Start the app
(async () => {
    await app.start(API_PORT);
    logger.info(`⚡️ Slack Bolt app is running on port ${API_PORT}`);
})();

process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', uncaughtExceptionHandler);