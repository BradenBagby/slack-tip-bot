import { AckFn, AllMiddlewareArgs, BlockElementAction, DialogSubmitAction, DialogValidation, FunctionInputs, InteractiveAction, RespondFn, SayArguments, SlackAction, SlackCommandMiddlewareArgs, StringIndexed, WorkflowStepEdit, } from "@slack/bolt";
import prisma from "./prisma";
import { BaseError } from "./utils/errors";
import { FunctionCompleteFn, FunctionFailFn } from "@slack/bolt/dist/CustomFunction";
import logger from "./utils/logger";
import QRCode from 'qrcode';
import { tmpdir } from 'os';
import path from 'path';


export const tipCommand = async ({ client, body, command }: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>) => {
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
}

export const getTipUrl = async (userId: string) => {
    const userConfig = await prisma.userConfiguration.findFirst({
        where: { userId: userId }
    });
    return userConfig?.url;
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
        const paymentUrl = tipUrl;

        // Generate QR code as base64
        const qrBase64 = await QRCode.toDataURL(paymentUrl);

        // Post ephemeral message with QR code as attachment
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: `QR Code for $${amount} payment`,
            attachments: [{
                image_url: 'https://picsum.photos/200/300',
                fallback: `QR Code for $${amount} payment`
            }]
        });

    } catch (error) {
        logger.error('Error handling QR code generation:', error);
        if (body.channel?.id)
            await client.chat.postEphemeral({
                channel: body.channel.id,
                user: body.user.id,
                text: "Error generating QR code"
            });
    }
}