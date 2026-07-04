-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "metadata" TEXT,
    CONSTRAINT "Subscription_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "units" REAL NOT NULL DEFAULT 1,
    "cost" REAL NOT NULL DEFAULT 0,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LlmCallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "costUsd" REAL NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "promptHash" TEXT NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LlmCallLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HumanReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT,
    "llmOutput" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerNote" TEXT,
    "correctedOutput" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "HumanReviewItem_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE INDEX "Subscription_personId_idx" ON "Subscription"("personId");

-- CreateIndex
CREATE INDEX "UsageRecord_personId_idx" ON "UsageRecord"("personId");

-- CreateIndex
CREATE INDEX "UsageRecord_timestamp_idx" ON "UsageRecord"("timestamp");

-- CreateIndex
CREATE INDEX "LlmCallLog_personId_idx" ON "LlmCallLog"("personId");

-- CreateIndex
CREATE INDEX "LlmCallLog_promptHash_idx" ON "LlmCallLog"("promptHash");

-- CreateIndex
CREATE INDEX "LlmCallLog_timestamp_idx" ON "LlmCallLog"("timestamp");

-- CreateIndex
CREATE INDEX "HumanReviewItem_status_idx" ON "HumanReviewItem"("status");

-- CreateIndex
CREATE INDEX "HumanReviewItem_createdAt_idx" ON "HumanReviewItem"("createdAt");
