-- =============================================
-- Migration: Fix ALL Foreign Keys to Users Table
-- Run this in Supabase SQL Editor
-- =============================================

-- First, let's check what constraints exist
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Checking existing foreign keys to users table...';
    
    FOR r IN 
        SELECT 
            tc.table_name, 
            tc.constraint_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users'
    LOOP
        RAISE NOTICE 'Found: %.% -> users (constraint: %)', 
            r.table_name, r.column_name, r.constraint_name;
    END LOOP;
END $$;

-- =============================================
-- FIX TICKETS TABLE
-- =============================================

-- 1. Make created_by nullable
ALTER TABLE tickets ALTER COLUMN created_by DROP NOT NULL;

-- 2. Drop existing constraint (try multiple possible names)
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_created_by_fkey;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_created_by;

-- 3. Recreate with SET NULL
ALTER TABLE tickets 
ADD CONSTRAINT tickets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================
-- FIX SCAN_LOGS TABLE
-- =============================================

-- 1. Make scanned_by nullable  
ALTER TABLE scan_logs ALTER COLUMN scanned_by DROP NOT NULL;

-- 2. Drop existing constraint
ALTER TABLE scan_logs DROP CONSTRAINT IF EXISTS scan_logs_scanned_by_fkey;
ALTER TABLE scan_logs DROP CONSTRAINT IF EXISTS fk_scan_logs_scanned_by;

-- 3. Recreate with SET NULL
ALTER TABLE scan_logs 
ADD CONSTRAINT scan_logs_scanned_by_fkey 
FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================
-- FIX SHIFTS TABLE (if exists)
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shifts') THEN
        -- Check if user_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'user_id') THEN
            ALTER TABLE shifts ALTER COLUMN user_id DROP NOT NULL;
            ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_user_id_fkey;
            ALTER TABLE shifts DROP CONSTRAINT IF EXISTS fk_shifts_user_id;
            ALTER TABLE shifts ADD CONSTRAINT shifts_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
            RAISE NOTICE 'Fixed shifts.user_id constraint';
        END IF;
    END IF;
END $$;

-- =============================================
-- FIX ANY OTHER TABLES WITH USER REFERENCES
-- =============================================

DO $$
DECLARE
    rec RECORD;
    sql_cmd TEXT;
BEGIN
    -- Find all foreign keys pointing to users table
    FOR rec IN 
        SELECT 
            tc.table_name,
            kcu.column_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users'
            AND tc.table_schema = 'public'
    LOOP
        -- Make column nullable
        sql_cmd := format('ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL', 
            rec.table_name, rec.column_name);
        BEGIN
            EXECUTE sql_cmd;
            RAISE NOTICE 'Made %.% nullable', rec.table_name, rec.column_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Column %.% already nullable or error: %', 
                rec.table_name, rec.column_name, SQLERRM;
        END;
        
        -- Drop and recreate constraint with SET NULL
        sql_cmd := format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
            rec.table_name, rec.constraint_name);
        EXECUTE sql_cmd;
        
        sql_cmd := format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE SET NULL', 
            rec.table_name, rec.constraint_name, rec.column_name);
        BEGIN
            EXECUTE sql_cmd;
            RAISE NOTICE 'Fixed constraint % on %.%', 
                rec.constraint_name, rec.table_name, rec.column_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error fixing constraint: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- =============================================
-- VERIFY CHANGES
-- =============================================

SELECT 
    tc.table_name, 
    kcu.column_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- If delete_rule shows 'SET NULL' for all rows, the migration is successful!
