-- CreateTable
CREATE TABLE "TrizProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetSdgs" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TrizContradiction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "improvingIds" TEXT NOT NULL,
    "worseningIds" TEXT NOT NULL,
    "ifThenButText" TEXT NOT NULL,
    CONSTRAINT "TrizContradiction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TrizProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrizSampledTriplet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "principles" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    CONSTRAINT "TrizSampledTriplet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TrizProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrizCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tripletId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "appliedRules" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrizCandidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TrizProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrizEvaluationScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "criteriaName" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "rationale" TEXT NOT NULL,
    CONSTRAINT "TrizEvaluationScore_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TrizProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrizEvaluationScore_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "TrizCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrizSelection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrizSelection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TrizProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TrizContradiction_projectId_key" ON "TrizContradiction"("projectId");

-- CreateIndex
CREATE INDEX "TrizSampledTriplet_projectId_idx" ON "TrizSampledTriplet"("projectId");

-- CreateIndex
CREATE INDEX "TrizCandidate_projectId_idx" ON "TrizCandidate"("projectId");

-- CreateIndex
CREATE INDEX "TrizEvaluationScore_projectId_idx" ON "TrizEvaluationScore"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TrizEvaluationScore_candidateId_criteriaName_key" ON "TrizEvaluationScore"("candidateId", "criteriaName");

-- CreateIndex
CREATE UNIQUE INDEX "TrizSelection_projectId_key" ON "TrizSelection"("projectId");
