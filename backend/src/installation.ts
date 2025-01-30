import { Installation, InstallationQuery } from '@slack/bolt';
import prisma from './prisma';
import logger from './utils/logger';
import { BaseError } from './utils/errors';

export const storeInstallation = async (installation: Installation): Promise<void> => {
    try {
        if (!installation.team)
            throw new BaseError('Team id was missing in slack installation', installation);

        await prisma.slackInstallation.upsert({
            where: {
                slackTeamId: installation.team.id,
            },
            update: {
                botToken: installation.bot?.token || '',
                botId: installation.bot?.id || '',
                botUserId: installation.bot?.userId || '',
                enterpriseId: installation.enterprise?.id,
                enterpriseName: installation.enterprise?.name,
                teamName: installation.team.name,
                tokenType: installation.tokenType,
                isEnterpriseInstall: installation.isEnterpriseInstall,
            },
            create: {
                slackTeamId: installation.team.id,
                botToken: installation.bot?.token || '',
                botId: installation.bot?.id || '',
                botUserId: installation.bot?.userId || '',
                enterpriseId: installation.enterprise?.id,
                enterpriseName: installation.enterprise?.name,
                teamName: installation.team.name || '',
                tokenType: installation.tokenType || '',
                isEnterpriseInstall: installation.isEnterpriseInstall,
            },
        });
    } catch (error) {
        logger.error('Failed to store installation:', error);
        throw error;
    }
}

export const fetchInstallation = async (installQuery: InstallationQuery<boolean>): Promise<Installation> => {
    try {
        const installation = await prisma.slackInstallation.findFirst({
            where: {
                slackTeamId: installQuery.teamId,
                ...(installQuery.enterpriseId && {
                    enterpriseId: installQuery.enterpriseId,
                }),
            },
        });

        if (!installation)
            throw new BaseError('Installation not found', installQuery);


        return {
            team: { id: installation.slackTeamId, name: installation.teamName },
            enterprise: installation.enterpriseId ? {
                id: installation.enterpriseId,
                name: installation.enterpriseName || undefined,
            } : undefined,
            bot: {
                token: installation.botToken,
                userId: installation.botUserId,
                id: installation.botId,
            },
            tokenType: installation.tokenType,
            isEnterpriseInstall: installation.isEnterpriseInstall,
        } as Installation;
    } catch (error) {
        logger.error('Failed to fetch installation:', error);
        throw error;
    }
}