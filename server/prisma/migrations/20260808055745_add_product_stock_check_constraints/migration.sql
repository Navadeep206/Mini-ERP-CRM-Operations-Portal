-- AlterTable to add non-negative check constraints on Product stock columns
ALTER TABLE "Product" ADD CONSTRAINT chk_current_stock_non_negative CHECK ("currentStock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT chk_minimum_stock_non_negative CHECK ("minimumStock" >= 0);