-- =============================================
-- Fix RLS Policies for Categories
-- Run this after migration_flexible_categories.sql
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anon read categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated all categories" ON categories;

-- Create new policies that allow anon for all operations
-- Since we use custom auth (not Supabase Auth), we need anon access
CREATE POLICY "Allow all operations on categories" 
ON categories FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Also fix prices table if you still use it
DROP POLICY IF EXISTS "Allow anon read prices" ON prices;
DROP POLICY IF EXISTS "Allow authenticated all prices" ON prices;

CREATE POLICY "Allow all operations on prices" 
ON prices FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Fix tickets table
DROP POLICY IF EXISTS "Allow anon read tickets" ON tickets;
DROP POLICY IF EXISTS "Allow authenticated all tickets" ON tickets;

CREATE POLICY "Allow all operations on tickets" 
ON tickets FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Fix scan_logs table
DROP POLICY IF EXISTS "Allow anon read scan_logs" ON scan_logs;
DROP POLICY IF EXISTS "Allow authenticated all scan_logs" ON scan_logs;

CREATE POLICY "Allow all operations on scan_logs" 
ON scan_logs FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
