-- Migration: add PayrollLoan + PayrollLoanDeduction + loanDeduction on PayrollEntry

-- 1. Add loanDeduction column to PayrollEntry
ALTER TABLE "PayrollEntry"
  ADD COLUMN IF NOT EXISTS "loanDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 2. Create PayrollLoan table
CREATE TABLE IF NOT EXISTS "PayrollLoan" (
  "id"                TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "employeeId"        TEXT         NOT NULL,
  "description"       TEXT,
  "totalAmount"       DOUBLE PRECISION NOT NULL,
  "paidAmount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "installmentAmount" DOUBLE PRECISION NOT NULL,
  "status"            TEXT         NOT NULL DEFAULT 'ACTIVE',
  "startMonth"        INTEGER      NOT NULL,
  "startYear"         INTEGER      NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PayrollLoan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayrollLoan_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PayrollLoan_employeeId_idx" ON "PayrollLoan"("employeeId");
CREATE INDEX IF NOT EXISTS "PayrollLoan_status_idx"     ON "PayrollLoan"("status");

-- 3. Create PayrollLoanDeduction table
CREATE TABLE IF NOT EXISTS "PayrollLoanDeduction" (
  "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "loanId"     TEXT         NOT NULL,
  "employeeId" TEXT         NOT NULL,
  "month"      INTEGER      NOT NULL,
  "year"       INTEGER      NOT NULL,
  "amount"     DOUBLE PRECISION NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PayrollLoanDeduction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayrollLoanDeduction_loanId_fkey"
    FOREIGN KEY ("loanId") REFERENCES "PayrollLoan"("id") ON DELETE CASCADE,
  CONSTRAINT "PayrollLoanDeduction_loanId_month_year_key"
    UNIQUE ("loanId", "month", "year")
);

CREATE INDEX IF NOT EXISTS "PayrollLoanDeduction_loanId_idx"              ON "PayrollLoanDeduction"("loanId");
CREATE INDEX IF NOT EXISTS "PayrollLoanDeduction_employeeId_month_year_idx" ON "PayrollLoanDeduction"("employeeId", "month", "year");
