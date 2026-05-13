-- ============================================================
-- Cash Advance Log Import — as of 30/04/2026
-- Run this in Neon DB console
-- Each row = one consolidated loan per employee
-- paidAmount = Paid Previous + Apr-2026 Deduction
-- ============================================================

-- Check existing employees first (run this SELECT to verify names):
-- SELECT id, "empCode", name FROM "PayrollEmployee" ORDER BY name;

-- ============================================================
-- INSERT LOANS
-- ============================================================

DO $$
DECLARE
  emp_id TEXT;
BEGIN

  -- 1. Mantu Kumar — Balance: 2,978
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%mantu%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (T2987 + T3318)', 9000, 6022, 329, 'ACTIVE', 1, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Mantu Kumar';
  ELSE RAISE WARNING 'Employee not found: Mantu Kumar'; END IF;

  -- 2. Karthik — Balance: 474
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%karthik%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance - Car Fine (T3337 + T3362)', 907, 433, 433, 'ACTIVE', 4, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Karthik';
  ELSE RAISE WARNING 'Employee not found: Karthik'; END IF;

  -- 3. Khalil — Balance: 700
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%khalil%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (PC#350)', 1000, 300, 300, 'ACTIVE', 1, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Khalil';
  ELSE RAISE WARNING 'Employee not found: Khalil'; END IF;

  -- 4. Yaseen — Balance: 3,000
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%yaseen%' OR name ILIKE '%yassen%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (T3209)', 4000, 1000, 500, 'ACTIVE', 3, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Yaseen';
  ELSE RAISE WARNING 'Employee not found: Yaseen'; END IF;

  -- 5. Mohin — Balance: 1,125
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%mohin%' OR name ILIKE '%moheen%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (T3072)', 2000, 875, 285, 'ACTIVE', 1, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Mohin';
  ELSE RAISE WARNING 'Employee not found: Mohin'; END IF;

  -- 6. Bhagwan Prasad — Balance: 1,639
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%bhagwan%' OR name ILIKE '%prasad%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (T2987)', 5750, 4111, 398, 'ACTIVE', 1, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Bhagwan Prasad';
  ELSE RAISE WARNING 'Employee not found: Bhagwan Prasad'; END IF;

  -- 7. Ismaiel Abdouzied — Balance: 1,000
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%ismaiel%' OR name ILIKE '%ismail%' OR name ILIKE '%abdouzied%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (Jun-2023)', 1000, 0, 200, 'ACTIVE', 6, 2023, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Ismaiel Abdouzied';
  ELSE RAISE WARNING 'Employee not found: Ismaiel Abdouzied'; END IF;

  -- 8. Tariq — Balance: 1,500
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%tariq%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (T1866 + T2148)', 9000, 7500, 500, 'ACTIVE', 11, 2024, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Tariq';
  ELSE RAISE WARNING 'Employee not found: Tariq'; END IF;

  -- 9. Ansar Abdul Rehaman — Balance: 9,832
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%ansar%' OR name ILIKE '%rehaman%' OR name ILIKE '%rahman%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance Multiple (ADCB + RAK)', 19880, 10048, 500, 'ACTIVE', 11, 2024, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Ansar Abdul Rehaman';
  ELSE RAISE WARNING 'Employee not found: Ansar Abdul Rehaman'; END IF;

  -- 10. Islam Hamdy — Balance: 3,777
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%islam%' OR name ILIKE '%hamdy%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (T2784 + T3138 + T3357)', 7706, 3929, 430, 'ACTIVE', 11, 2025, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Islam Hamdy';
  ELSE RAISE WARNING 'Employee not found: Islam Hamdy'; END IF;

  -- 11. Mahmoud Foreman — Balance: 2,475
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%mahmoud%' OR name ILIKE '%mahumod%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance - Daman Fine (T3079 + T3357)', 5762, 3287, 1000, 'ACTIVE', 2, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Mahmoud Foreman';
  ELSE RAISE WARNING 'Employee not found: Mahmoud Foreman'; END IF;

  -- 12. Rajab (Aluminum) — Balance: 4,511
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%rajab%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Visa Expenses + Job Offer (T2935)', 7011, 2500, 500, 'ACTIVE', 12, 2025, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Rajab';
  ELSE RAISE WARNING 'Employee not found: Rajab'; END IF;

  -- 13. Osama Saeed (Aluminum) — Balance: 5,815
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%osama%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Visa Expenses + Job Offer (T2995 + T3091)', 7015, 1200, 300, 'ACTIVE', 1, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Osama Saeed';
  ELSE RAISE WARNING 'Employee not found: Osama Saeed'; END IF;

  -- 14. Mohamed Abdou (Aluminum) — Balance: 6,068
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%abdou%' OR name ILIKE '%mohamed abdou%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Visa Expenses + Job Offer (T3034 + T3091)', 7268, 1200, 300, 'ACTIVE', 1, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Mohamed Abdou';
  ELSE RAISE WARNING 'Employee not found: Mohamed Abdou'; END IF;

  -- 15. Saeed Driver — Balance: 4,650
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%saeed%' AND (name ILIKE '%driver%' OR "empCode" ILIKE '%driver%' OR "costCenter" ILIKE '%driver%') LIMIT 1;
  IF emp_id IS NULL THEN
    -- Try just Saeed if no driver-specific match
    SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%saeed%' LIMIT 1;
  END IF;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance - Bus & Pickup Fine (T3182)', 5650, 1000, 500, 'ACTIVE', 2, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Saeed Driver';
  ELSE RAISE WARNING 'Employee not found: Saeed Driver'; END IF;

  -- 16. Alok Kumar — Balance: 1,031
  SELECT id INTO emp_id FROM "PayrollEmployee" WHERE name ILIKE '%alok%' LIMIT 1;
  IF emp_id IS NOT NULL THEN
    INSERT INTO "PayrollLoan" (id, "employeeId", description, "totalAmount", "paidAmount", "installmentAmount", status, "startMonth", "startYear", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), emp_id, 'Cash Advance (T3107)', 1500, 469, 269, 'ACTIVE', 3, 2026, NOW(), NOW());
    RAISE NOTICE 'Inserted loan for Alok Kumar';
  ELSE RAISE WARNING 'Employee not found: Alok Kumar'; END IF;

END $$;

-- ============================================================
-- VERIFY — Run after insert to check what was added
-- ============================================================
SELECT
  e.name,
  e."empCode",
  l.description,
  l."totalAmount",
  l."paidAmount",
  l."totalAmount" - l."paidAmount" AS balance,
  l."installmentAmount",
  l.status
FROM "PayrollLoan" l
JOIN "PayrollEmployee" e ON e.id = l."employeeId"
ORDER BY e.name;
