-- CreateTable
CREATE TABLE "SlackInstallation" (
    "id" TEXT NOT NULL,
    "slackTeamId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "botUserId" TEXT NOT NULL,
    "enterpriseId" TEXT,
    "enterpriseName" TEXT,
    "teamName" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEnterpriseInstall" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SlackInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlackInstallation_slackTeamId_key" ON "SlackInstallation"("slackTeamId");

-- CreateIndex
CREATE INDEX "SlackInstallation_slackTeamId_idx" ON "SlackInstallation"("slackTeamId");
