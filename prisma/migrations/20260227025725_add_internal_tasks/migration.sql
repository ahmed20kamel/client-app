-- CreateTable
CREATE TABLE "InternalTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "departmentId" TEXT,
    "categoryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueAt" DATETIME,
    "completedAt" DATETIME,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InternalTaskComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalTaskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COMMENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TaskRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalTaskId" TEXT NOT NULL,
    "ratedById" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "strengths" TEXT,
    "improvements" TEXT,
    "notes" TEXT,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksOnTime" INTEGER NOT NULL DEFAULT 0,
    "averageRating" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "InternalTask_assignedToId_idx" ON "InternalTask"("assignedToId");

-- CreateIndex
CREATE INDEX "InternalTask_createdById_idx" ON "InternalTask"("createdById");

-- CreateIndex
CREATE INDEX "InternalTask_approvedById_idx" ON "InternalTask"("approvedById");

-- CreateIndex
CREATE INDEX "InternalTask_departmentId_idx" ON "InternalTask"("departmentId");

-- CreateIndex
CREATE INDEX "InternalTask_categoryId_idx" ON "InternalTask"("categoryId");

-- CreateIndex
CREATE INDEX "InternalTask_status_idx" ON "InternalTask"("status");

-- CreateIndex
CREATE INDEX "InternalTask_priority_idx" ON "InternalTask"("priority");

-- CreateIndex
CREATE INDEX "InternalTask_dueAt_idx" ON "InternalTask"("dueAt");

-- CreateIndex
CREATE INDEX "InternalTask_createdAt_idx" ON "InternalTask"("createdAt");

-- CreateIndex
CREATE INDEX "InternalTaskComment_internalTaskId_idx" ON "InternalTaskComment"("internalTaskId");

-- CreateIndex
CREATE INDEX "InternalTaskComment_userId_idx" ON "InternalTaskComment"("userId");

-- CreateIndex
CREATE INDEX "InternalTaskComment_createdAt_idx" ON "InternalTaskComment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaskRating_internalTaskId_key" ON "TaskRating"("internalTaskId");

-- CreateIndex
CREATE INDEX "TaskRating_ratedById_idx" ON "TaskRating"("ratedById");

-- CreateIndex
CREATE INDEX "TaskRating_ratedUserId_idx" ON "TaskRating"("ratedUserId");

-- CreateIndex
CREATE INDEX "TaskRating_createdAt_idx" ON "TaskRating"("createdAt");

-- CreateIndex
CREATE INDEX "PerformanceReview_userId_idx" ON "PerformanceReview"("userId");

-- CreateIndex
CREATE INDEX "PerformanceReview_reviewerId_idx" ON "PerformanceReview"("reviewerId");

-- CreateIndex
CREATE INDEX "PerformanceReview_period_idx" ON "PerformanceReview"("period");

-- CreateIndex
CREATE INDEX "PerformanceReview_status_idx" ON "PerformanceReview"("status");

-- CreateIndex
CREATE INDEX "PerformanceReview_createdAt_idx" ON "PerformanceReview"("createdAt");
