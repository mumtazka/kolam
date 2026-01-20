-- =============================================
-- Migration: Add Session Ticket Support to Categories
-- Description: Add session_id and booking_date columns to categories table
--              to properly link ticket categories with sessions
-- Date: 2026-01-20
-- =============================================

-- Add session_id column (nullable, foreign key to sessions)
ALTER TABLE categories 
ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;

-- Add booking_date column for one-time session tickets
ALTER TABLE categories 
ADD COLUMN booking_date DATE;

-- Add index for better query performance
CREATE INDEX idx_categories_session_id ON categories(session_id);
CREATE INDEX idx_categories_booking_date ON categories(booking_date);

-- Add comment for documentation
COMMENT ON COLUMN categories.session_id IS 'Links this category to a session if it was created from a session';
COMMENT ON COLUMN categories.booking_date IS 'Booking date for one-time session tickets. NULL for regular categories and recurring session tickets';

-- =============================================
-- Data Migration (Optional)
-- Migrate existing session metadata from description field
-- =============================================

-- This will attempt to extract session_id from existing JSON in description field
-- Only runs if there are categories with session_ticket metadata in description

DO $$
DECLARE
    cat_record RECORD;
    session_uuid UUID;
    metadata_json JSONB;
BEGIN
    FOR cat_record IN 
        SELECT id, description 
        FROM categories 
        WHERE description IS NOT NULL 
        AND description LIKE '%"type":"session_ticket"%'
    LOOP
        BEGIN
            -- Parse JSON from description
            metadata_json := description::JSONB;
            
            -- Extract session_id
            session_uuid := (metadata_json->>'session_id')::UUID;
            
            -- Update category with proper session_id
            UPDATE categories 
            SET 
                session_id = session_uuid,
                booking_date = CASE 
                    WHEN (metadata_json->>'is_recurring')::BOOLEAN = FALSE 
                    THEN (metadata_json->>'booking_date')::DATE
                    ELSE NULL
                END,
                -- Keep description but you can clear it if you want
                description = metadata_json->>'session_name'
            WHERE id = cat_record.id;
            
            RAISE NOTICE 'Migrated category: %', cat_record.id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to migrate category %: %', cat_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- =============================================
-- Verification Query
-- =============================================

-- Run this to verify the migration
-- SELECT 
--     c.id,
--     c.name,
--     c.code_prefix,
--     c.session_id,
--     c.booking_date,
--     s.name as session_name,
--     s.is_recurring as session_recurring
-- FROM categories c
-- LEFT JOIN sessions s ON c.session_id = s.id
-- WHERE c.session_id IS NOT NULL
-- ORDER BY c.created_at DESC;
