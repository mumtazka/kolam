-- Migration: Add role_at_scan and shift_label columns to scan_logs
-- Run this in Supabase SQL editor

-- Add role_at_scan to track the scanner's role at the time of scanning
ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS role_at_scan TEXT;

-- Add shift_label to track the active shift (MORNING/AFTERNOON) at scan time
ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS shift_label TEXT;

-- Create index for faster querying by shift
CREATE INDEX IF NOT EXISTS idx_scan_logs_shift_label ON scan_logs(shift_label);
CREATE INDEX IF NOT EXISTS idx_scan_logs_role_at_scan ON scan_logs(role_at_scan);
