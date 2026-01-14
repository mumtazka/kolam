-- Migration: Fix weekly_schedules constraints
-- The previous constraint might have been too restrictive or missing new roles.
-- Allowed roles: 'OFF', 'RECEPTIONIST', 'SCANNER', 'ADMIN', 'CASHIER'

-- Drop existing constraints if they exist (names may vary, checking common names)
ALTER TABLE weekly_schedules DROP CONSTRAINT IF EXISTS weekly_schedules_morning_role_check;
ALTER TABLE weekly_schedules DROP CONSTRAINT IF EXISTS weekly_schedules_afternoon_role_check;

-- Re-add constraints with correct values
ALTER TABLE weekly_schedules 
ADD CONSTRAINT weekly_schedules_morning_role_check 
CHECK (morning_role IN ('OFF', 'RECEPTIONIST', 'SCANNER', 'ADMIN', 'CASHIER'));

ALTER TABLE weekly_schedules 
ADD CONSTRAINT weekly_schedules_afternoon_role_check 
CHECK (afternoon_role IN ('OFF', 'RECEPTIONIST', 'SCANNER', 'ADMIN', 'CASHIER'));
