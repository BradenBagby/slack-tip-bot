import { AckFn, AllMiddlewareArgs, BlockElementAction, DialogSubmitAction, DialogValidation, FunctionInputs, InteractiveAction, RespondFn, SayArguments, SlackAction, SlackCommandMiddlewareArgs, StringIndexed, WorkflowStepEdit, } from "@slack/bolt";
import prisma from "./prisma";
import { BaseError } from "./utils/errors";
import { FunctionCompleteFn, FunctionFailFn } from "@slack/bolt/dist/CustomFunction";
import logger from "./utils/logger";
import QRCode from 'qrcode';
import { tmpdir } from 'os';
import path from 'path';
import { HOST } from "./utils/env";


export const tipCommand = async ({ client, body, command }: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>) => {
    const userId = command.user_id;
    if (!userId) throw new BaseError('User ID not found', command);

    const user = await getUserInfo(userId);
    const tipUrl = user?.url;
    if (!tipUrl) {
        await client.chat.postMessage({
            channel: command.channel_id,
            text: "Please configure your payment URL first using `/tip configure`"
        });
        return;
    }

    try {
        // For DMs, we need to open a direct message channel first
        let channelId = command.channel_id;
        if (command.channel_name === 'directmessage') {
            const conversation = await client.conversations.open({
                users: userId
            });
            channelId = conversation.channel?.id as string;
        }

        // Send message with amount buttons
        await client.chat.postMessage({
            channel: channelId,
            text: `Select an amount to tip ${user.userName || ''}:`, // Added text for accessibility
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Select an amount to tip ${user.userName || ''}:`
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
    } catch (error) {
        logger.error('Error handling /tip command:', error);
        throw new BaseError('Failed to send tip message', error);
    }
}

export const getUserInfo = async (userId: string) => {
    const userConfig = await prisma.userConfiguration.findFirst({
        where: { userId: userId }
    });
    return userConfig;
}

export const buildTipQr = async (url: string, userId: string): Promise<string> => {
    const filename = `qr_${userId}.png`;
    const filePath = path.join(tmpdir(), filename);
    await QRCode.toFile(filePath, url, {
        type: 'png',
        width: 300,
        margin: 2,
    });
    return filePath;
}

export const tipAction = async ({ client, body, action, ack }: {
    payload: BlockElementAction | DialogSubmitAction | WorkflowStepEdit | InteractiveAction;
    action: BlockElementAction | DialogSubmitAction | WorkflowStepEdit | InteractiveAction;
    body: SlackAction;
    respond: RespondFn;
    ack: AckFn<void> | AckFn<string | SayArguments> | AckFn<DialogValidation>;
    complete?: FunctionCompleteFn;
    fail?: FunctionFailFn;
    inputs?: FunctionInputs;
} & AllMiddlewareArgs<StringIndexed>) => {
    const buttonAction = action as BlockElementAction;
    await ack();
    try {
        const amount = buttonAction.action_id.split('_')[2];
        const tippingUser = await getUserInfo(body.user.id);
        const tipUrl = tippingUser?.url;
        
        // Handle DM channels
        let channelId = body.channel?.id;
        if (!channelId) {
            const conversation = await client.conversations.open({
                users: body.user.id
            });
            channelId = conversation.channel?.id;
        }
        if (!channelId) throw new BaseError('Could not determine channel ID', body);

        if (!tipUrl) {
            await client.chat.postEphemeral({
                channel: channelId,
                user: body.user.id,
                text: "Error: Payment URL not configured"
            });
            return;
        }

        // Get user info from Slack API for full name
        const userInfo = await client.users.info({
            user: body.user.id
        });
        const userName = userInfo.user?.real_name || 'Someone';


        // send message to channel saying 'this user tipped $amount'
        await client.chat.postMessage({
            channel: channelId,
            text: `${userName} tipped ${tippingUser?.userName || ''} $${amount}!`
        });

        // Post ephemeral message with QR code as attachment
        await client.chat.postEphemeral({
            channel: channelId,
            user: body.user.id,
            text: `Thanks for the tip!`,
            attachments: [
                {
                    text: tipUrl,
                },
                {
                    fallback: "QR Code for payment",
                    image_url: `${HOST}/api/tip/${body.user.id}`,
                    title: "Scan to pay",
                },

            ]
        });


    } catch (error) {
        logger.error('Error handling QR code generation:', error);
        // Try to send error message even if channel ID wasn't found initially
        try {
            const conversation = await client.conversations.open({
                users: body.user.id
            });
            await client.chat.postEphemeral({
                channel: conversation.channel?.id as string,
                user: body.user.id,
                text: "Error generating QR code"
            });
        } catch (secondaryError) {
            logger.error('Failed to send error message:', secondaryError);
        }
    }
}