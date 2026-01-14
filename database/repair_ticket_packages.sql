-- =============================================
-- Repair Script: Fix Ticket Packages Issues
-- =============================================

-- 1. Fix Edit Error: "record new has no field updated_at"
-- This adds the missing column and ensures the trigger is correctly applied.
ALTER TABLE ticket_packages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS update_ticket_packages_updated_at ON ticket_packages;
CREATE TRIGGER update_ticket_packages_updated_at BEFORE UPDATE ON ticket_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Fix Delete Error: "violates foreign key constraint tickets_package_id_fkey"
-- This changes the constraint to SET NULL instead of preventing deletion.
-- When a package is deleted, tickets associated with it will keep their data but package_id becomes NULL.
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_package_id_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_package_id_fkey 
    FOREIGN KEY (package_id) 
    REFERENCES ticket_packages(id) 
    ON DELETE SET NULL;
