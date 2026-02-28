-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "contactPerson" TEXT,
    "customerType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW_INQUIRY',
    "emirate" TEXT,
    "projectType" TEXT,
    "productType" TEXT,
    "leadSource" TEXT,
    "estimatedValue" REAL,
    "probability" INTEGER DEFAULT 10,
    "weightedValue" REAL DEFAULT 0,
    "consultant" TEXT,
    "paymentTerms" TEXT,
    "projectSize" REAL,
    "notes" TEXT,
    "lastFollowUp" DATETIME,
    "nextFollowUp" DATETIME,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Customer" ("createdAt", "createdById", "customerType", "deletedAt", "fullName", "id", "nationalId", "notes", "ownerId", "phone", "status", "updatedAt") SELECT "createdAt", "createdById", "customerType", "deletedAt", "fullName", "id", "nationalId", "notes", "ownerId", "phone", "status", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_nationalId_key" ON "Customer"("nationalId");
CREATE INDEX "Customer_ownerId_idx" ON "Customer"("ownerId");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_customerType_idx" ON "Customer"("customerType");
CREATE INDEX "Customer_status_idx" ON "Customer"("status");
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX "Customer_leadSource_idx" ON "Customer"("leadSource");
CREATE INDEX "Customer_emirate_idx" ON "Customer"("emirate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
