-- =============================================
-- Fix: Ticket Packages RLS
-- Description: Allow anon users to create/edit packages (required for custom auth)
-- =============================================

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow anon read ticket_packages" ON ticket_packages;
DROP POLICY IF EXISTS "Allow authenticated full access ticket_packages" ON ticket_packages;

-- 2. Create new permissive policies
-- Allow anon (public) to do everything. 
-- In a custom auth setup, the app logic handles security.
CREATE POLICY "Allow full access ticket_packages" 
ON ticket_packages 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- Keep authenticated policy for future proofing
CREATE POLICY "Allow authenticated full access ticket_packages" 
ON ticket_packages 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
