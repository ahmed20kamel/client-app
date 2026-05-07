-- CreateTable: PayrollEmployee
CREATE TABLE "PayrollEmployee" (
    "id"             TEXT NOT NULL,
    "empCode"        TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "visaType"       TEXT NOT NULL,
    "costCenter"     TEXT NOT NULL,
    "wpsEntity"      TEXT NOT NULL,
    "paymentMethod"  TEXT NOT NULL DEFAULT 'WPS',
    "basicSalary"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowances"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSalary"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursPerDay"    DOUBLE PRECISION NOT NULL DEFAULT 9,
    "status"         TEXT NOT NULL DEFAULT 'ACTIVE',
    "remarks"        TEXT,
    "startDate"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollEmployee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollEmployee_empCode_key" ON "PayrollEmployee"("empCode");
CREATE INDEX "PayrollEmployee_costCenter_idx" ON "PayrollEmployee"("costCenter");
CREATE INDEX "PayrollEmployee_visaType_idx" ON "PayrollEmployee"("visaType");
CREATE INDEX "PayrollEmployee_status_idx" ON "PayrollEmployee"("status");
CREATE INDEX "PayrollEmployee_empCode_idx" ON "PayrollEmployee"("empCode");

-- CreateTable: PayrollProject
CREATE TABLE "PayrollProject" (
    "id"            TEXT NOT NULL,
    "projectCode"   TEXT NOT NULL,
    "projectName"   TEXT NOT NULL,
    "location"      TEXT,
    "completionPct" DOUBLE PRECISION DEFAULT 0,
    "contractValue" DOUBLE PRECISION,
    "consultant"    TEXT,
    "status"        TEXT NOT NULL DEFAULT 'ONGOING',
    "revenue"       DOUBLE PRECISION,
    "retention"     DOUBLE PRECISION,
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollProject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollProject_projectCode_key" ON "PayrollProject"("projectCode");
CREATE INDEX "PayrollProject_status_idx" ON "PayrollProject"("status");
CREATE INDEX "PayrollProject_projectCode_idx" ON "PayrollProject"("projectCode");

-- CreateTable: PayrollTimesheet
CREATE TABLE "PayrollTimesheet" (
    "id"        TEXT NOT NULL,
    "month"     INTEGER NOT NULL,
    "year"      INTEGER NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'OPEN',
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollTimesheet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollTimesheet_month_year_key" ON "PayrollTimesheet"("month", "year");
CREATE INDEX "PayrollTimesheet_year_idx" ON "PayrollTimesheet"("year");
CREATE INDEX "PayrollTimesheet_status_idx" ON "PayrollTimesheet"("status");

-- CreateTable: PayrollTimesheetEntry
CREATE TABLE "PayrollTimesheetEntry" (
    "id"          TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "employeeId"  TEXT NOT NULL,
    "day"         INTEGER NOT NULL,
    "hours"       DOUBLE PRECISION,
    "dayStatus"   TEXT NOT NULL DEFAULT 'P',
    "projectId"   TEXT,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollTimesheetEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollTimesheetEntry_timesheetId_employeeId_day_key"
    ON "PayrollTimesheetEntry"("timesheetId", "employeeId", "day");
CREATE INDEX "PayrollTimesheetEntry_timesheetId_idx" ON "PayrollTimesheetEntry"("timesheetId");
CREATE INDEX "PayrollTimesheetEntry_employeeId_idx" ON "PayrollTimesheetEntry"("employeeId");
CREATE INDEX "PayrollTimesheetEntry_projectId_idx"  ON "PayrollTimesheetEntry"("projectId");

ALTER TABLE "PayrollTimesheetEntry"
    ADD CONSTRAINT "PayrollTimesheetEntry_timesheetId_fkey"
    FOREIGN KEY ("timesheetId") REFERENCES "PayrollTimesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollTimesheetEntry"
    ADD CONSTRAINT "PayrollTimesheetEntry_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollTimesheetEntry"
    ADD CONSTRAINT "PayrollTimesheetEntry_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "PayrollProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: PayrollEntry
CREATE TABLE "PayrollEntry" (
    "id"              TEXT NOT NULL,
    "month"           INTEGER NOT NULL,
    "year"            INTEGER NOT NULL,
    "employeeId"      TEXT NOT NULL,
    "basicSalary"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowances"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowance"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSalary"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workDays"        INTEGER NOT NULL DEFAULT 0,
    "absentDays"      INTEGER NOT NULL DEFAULT 0,
    "otHours"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otAmount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absentDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowanceAdj"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deduction"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustment"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalary"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wpsAmount"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashAmount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otPayment"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPayment"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks"         TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollEntry_month_year_employeeId_key"
    ON "PayrollEntry"("month", "year", "employeeId");
CREATE INDEX "PayrollEntry_month_year_idx" ON "PayrollEntry"("month", "year");
CREATE INDEX "PayrollEntry_employeeId_idx" ON "PayrollEntry"("employeeId");

ALTER TABLE "PayrollEntry"
    ADD CONSTRAINT "PayrollEntry_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
