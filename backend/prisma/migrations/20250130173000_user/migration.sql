-- CreateTable
CREATE TABLE "UserConfiguration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConfiguration_userId_idx" ON "UserConfiguration"("userId");

-- CreateIndex
CREATE INDEX "UserConfiguration_teamId_idx" ON "UserConfiguration"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConfiguration_userId_teamId_key" ON "UserConfiguration"("userId", "teamId");
