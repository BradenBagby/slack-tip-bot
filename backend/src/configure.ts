import { AllMiddlewareArgs, SlackCommandMiddlewareArgs, SlackViewAction, SlackViewMiddlewareArgs, StringIndexed, ViewSubmitAction, } from "@slack/bolt";
import prisma from "./prisma";
import logger from "./utils/logger";

export const configureCommand = async ({ client, body }: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>) => {
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
}


export const configureModal = async ({ ack, view, body, client }: SlackViewMiddlewareArgs<SlackViewAction> & AllMiddlewareArgs<StringIndexed>) => {
    // Acknowledge the view submission immediately
    await ack();
    try {
        const url = view.state.values.url_input.url.value;
        const teamId = body.team?.id;
        const userId = body.user.id;

        // Get user info from Slack API for full name
        const userInfo = await client.users.info({
            user: body.user.id
        });
        const userName = userInfo.user?.real_name || body.user?.name;



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
                userName: userName,
            },
            create: {
                userId: userId,
                teamId: teamId,
                url: url,
                userName: userName,
            },
        });

        await client.chat.postMessage({
            channel: body.user.id,
            text: "Tip URL set to " + url
        });

    } catch (error) {
        logger.error('Error handling configure modal submission:', error);
        // Send error message to user
        await client.chat.postMessage({
            channel: body.user.id,
            text: "Sorry, there was an error saving your configuration."
        });
    }
}