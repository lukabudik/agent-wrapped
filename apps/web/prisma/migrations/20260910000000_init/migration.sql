-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "totalTokens" BIGINT NOT NULL,
    "apiEquivalentUsd" DECIMAL(14,4) NOT NULL,
    "activeDays" INTEGER NOT NULL,
    "currentStreak" INTEGER NOT NULL,
    "linesAdded" INTEGER NOT NULL,
    "agents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_quotas" (
    "userId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "publish_quotas_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE INDEX "snapshots_totalTokens_id_idx" ON "snapshots"("totalTokens" DESC, "id");

-- CreateIndex
CREATE INDEX "snapshots_apiEquivalentUsd_id_idx" ON "snapshots"("apiEquivalentUsd" DESC, "id");

-- CreateIndex
CREATE INDEX "snapshots_currentStreak_id_idx" ON "snapshots"("currentStreak" DESC, "id");

-- CreateIndex
CREATE INDEX "snapshots_activeDays_id_idx" ON "snapshots"("activeDays" DESC, "id");

-- CreateIndex
CREATE UNIQUE INDEX "snapshots_userId_key" ON "snapshots"("userId");

-- AddForeignKey
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_quotas" ADD CONSTRAINT "publish_quotas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

