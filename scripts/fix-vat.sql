-- Fix VAT calculation for all existing tax invoices
-- VAT should apply on (subtotal - discount + deliveryCharges)
-- Run this once in pgAdmin on the 'crm' database

-- Preview first (what will change):
SELECT
  "invoiceNumber",
  "subtotal",
  "discount",
  "deliveryCharges",
  "taxPercent",
  "taxAmount"                                                     AS old_tax,
  ROUND(("subtotal" - "discount" + "deliveryCharges") * "taxPercent" / 100, 2) AS new_tax,
  "total"                                                         AS old_total,
  ROUND("subtotal" - "discount" + "deliveryCharges"
        + ("subtotal" - "discount" + "deliveryCharges") * "taxPercent" / 100, 2) AS new_total
FROM "TaxInvoice"
WHERE "deliveryCharges" > 0
  AND ABS("taxAmount" - ROUND(("subtotal" - "discount" + "deliveryCharges") * "taxPercent" / 100, 2)) > 0.01
ORDER BY "createdAt";

-- ─── Run the UPDATE after reviewing the preview above ───
UPDATE "TaxInvoice"
SET
  "taxAmount" = ROUND(("subtotal" - "discount" + "deliveryCharges") * "taxPercent" / 100, 2),
  "total"     = ROUND(
                  "subtotal" - "discount" + "deliveryCharges"
                  + ("subtotal" - "discount" + "deliveryCharges") * "taxPercent" / 100,
                2)
WHERE "deliveryCharges" > 0
  AND ABS("taxAmount" - ROUND(("subtotal" - "discount" + "deliveryCharges") * "taxPercent" / 100, 2)) > 0.01;

-- Confirm how many rows were updated:
-- SELECT COUNT(*) FROM "TaxInvoice" WHERE "deliveryCharges" > 0;
