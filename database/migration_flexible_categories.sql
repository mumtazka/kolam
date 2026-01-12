-- =============================================
-- Kolam Renang UNY - Migration Script
-- Add Flexible Ticket Categories
-- =============================================
-- Run this script on your existing Supabase database
-- to add the new flexible ticket category system.
-- =============================================

-- Step 1: Add new columns to categories table
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(3),
  ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Step 2: Update existing categories with default prefixes
-- Adjust these values as needed for your existing categories
UPDATE categories SET code_prefix = 'U' WHERE name = 'Umum' AND code_prefix IS NULL;
UPDATE categories SET code_prefix = 'M' WHERE name = 'Mahasiswa' AND code_prefix IS NULL;
UPDATE categories SET code_prefix = 'K' WHERE name = 'Khusus' AND code_prefix IS NULL;
UPDATE categories SET code_prefix = 'L' WHERE name = 'Liburan' AND code_prefix IS NULL;

-- Step 3: Migrate prices from prices table to categories table
UPDATE categories c
SET price = p.price
FROM prices p
WHERE p.category_id = c.id;

-- Step 4: Make code_prefix NOT NULL and UNIQUE after populating data
-- First ensure all categories have a prefix
UPDATE categories 
SET code_prefix = LEFT(UPPER(name), 1) 
WHERE code_prefix IS NULL;

-- Handle duplicates if any (append number)
DO $$
DECLARE
    dup_record RECORD;
    counter INT := 1;
BEGIN
    FOR dup_record IN
        SELECT id, code_prefix
        FROM categories c1
        WHERE EXISTS (
            SELECT 1 FROM categories c2 
            WHERE c2.code_prefix = c1.code_prefix 
            AND c2.id < c1.id
        )
    LOOP
        UPDATE categories 
        SET code_prefix = LEFT(dup_record.code_prefix, 2) || counter::TEXT
        WHERE id = dup_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Now add constraints
ALTER TABLE categories
  ALTER COLUMN code_prefix SET NOT NULL;

-- Add unique constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_code_prefix_key'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT categories_code_prefix_key UNIQUE (code_prefix);
    END IF;
END $$;

-- Step 5: Add ticket_code column to tickets table
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(50);

-- Step 6: Generate ticket codes for existing tickets
UPDATE tickets t
SET ticket_code = CONCAT(
    COALESCE((SELECT code_prefix FROM categories WHERE id = t.category_id), 'TKT'),
    '-',
    TO_CHAR(t.created_at, 'YYYYMMDD'),
    '-',
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    '-',
    UPPER(SUBSTRING(MD5(t.id::TEXT) FROM 1 FOR 4))
)
WHERE ticket_code IS NULL;

-- Step 7: Make ticket_code NOT NULL and UNIQUE
ALTER TABLE tickets
  ALTER COLUMN ticket_code SET NOT NULL;

-- Add unique constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tickets_ticket_code_key'
    ) THEN
        ALTER TABLE tickets ADD CONSTRAINT tickets_ticket_code_key UNIQUE (ticket_code);
    END IF;
END $$;

-- Step 8: Add index for ticket_code lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);

-- Step 9: Optional - Add new example categories
INSERT INTO categories (name, code_prefix, requires_nim, price, active, description)
SELECT 'VIP', 'VIP', FALSE, 50000, TRUE, 'Tiket VIP dengan akses premium'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE code_prefix = 'VIP');

INSERT INTO categories (name, code_prefix, requires_nim, price, active, description)
SELECT 'Event', 'EVT', FALSE, 25000, FALSE, 'Tiket event khusus'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE code_prefix = 'EVT');

-- =============================================
-- Migration Complete!
-- =============================================
-- The prices table is now deprecated but NOT deleted
-- for safety. You can drop it manually after verifying:
-- DROP TABLE IF EXISTS prices;
-- =============================================
