-- AlterTable: add discount column to TaxInvoice
ALTER TABLE "TaxInvoice" ADD COLUMN "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;
