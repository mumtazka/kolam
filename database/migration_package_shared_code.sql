-- =============================================
-- Migration: Package Ticket Shared Code Feature
-- Run this in Supabase SQL Editor
-- =============================================

-- 0. Create helper function for random string generation (if not exists)
CREATE OR REPLACE FUNCTION generate_random_string(length INTEGER) RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 1. Add max_usage column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 1;

-- 2. Update existing 'K' prefix tickets to have max_usage = 100 (legacy support)
UPDATE tickets SET max_usage = 100 WHERE ticket_code LIKE 'K-%' AND max_usage = 1;

-- 3. Replace the process_ticket_transaction function to handle package tickets properly
CREATE OR REPLACE FUNCTION process_ticket_transaction(
    p_items JSONB,           -- Array of { category_id, quantity, package_id, nims[] }
    p_created_by UUID,       -- User ID of creator
    p_created_by_name TEXT,  -- Name of creator
    p_shift TEXT             -- Current shift
) RETURNS JSONB AS $$
DECLARE
    v_batch_id UUID;
    v_batch_number INTEGER;
    v_item JSONB;
    v_quantity INTEGER;
    v_category_id UUID;
    v_package_id UUID;
    v_nims JSONB;
    v_category_name TEXT;
    v_category_prefix TEXT;
    v_price DECIMAL;
    v_ticket_code TEXT;
    v_created_tickets JSONB := '[]'::JSONB;
    v_new_ticket RECORD;
    v_single_ticket_json JSONB;
    i INTEGER;
    date_str TEXT;
    batch_str TEXT;
    v_is_special BOOLEAN;
BEGIN
    -- Generate new Batch ID
    v_batch_id := uuid_generate_v4();
    
    -- Calculate Batch Number for today
    SELECT COALESCE(COUNT(DISTINCT batch_id), 0) + 1 INTO v_batch_number
    FROM tickets 
    WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + 1;

    -- Format segments for Ticket Code
    date_str := to_char(NOW(), 'YYYYMMDD');
    batch_str := lpad(v_batch_number::text, 4, '0');

    -- Iterate through each item in the cart
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_category_id := (v_item->>'category_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        -- Handle optional package_id
        IF (v_item->>'package_id') IS NULL OR (v_item->>'package_id') = '' THEN
            v_package_id := NULL;
        ELSE
            v_package_id := (v_item->>'package_id')::UUID;
        END IF;

        v_nims := v_item->'nims';

        -- Get Base Category Details
        SELECT name, code_prefix, price INTO v_category_name, v_category_prefix, v_price
        FROM categories WHERE id = v_category_id;
        
        -- Check if this is a special ticket (K prefix)
        v_is_special := (v_category_prefix = 'K');
        
        -- Override price if this is a Package item
        IF v_package_id IS NOT NULL THEN
             SELECT price_per_person INTO v_price FROM ticket_packages WHERE id = v_package_id;
        END IF;

        -- ============================================
        -- PACKAGE TICKET LOGIC: Same Code, Multiple Prints
        -- ============================================
        IF v_is_special AND v_package_id IS NOT NULL THEN
            -- Generate ONE ticket code
            v_ticket_code := v_category_prefix || '-' || date_str || '-' || batch_str || '-' || generate_random_string(4);
            
            -- Insert ONE ticket with max_usage = quantity
            INSERT INTO tickets (
                id, ticket_code, batch_id, category_id, category_name, 
                status, price, nim, qr_code, created_by, created_by_name, 
                shift, package_id, usage_count, max_usage
            ) VALUES (
                uuid_generate_v4(),
                v_ticket_code,
                v_batch_id,
                v_category_id,
                v_category_name,
                'UNUSED',
                v_price,
                NULL, -- No NIM for package tickets
                'https://barcodeapi.org/api/128/' || v_ticket_code,
                p_created_by,
                p_created_by_name,
                p_shift,
                v_package_id,
                0,
                v_quantity  -- max_usage = number of people in package
            ) RETURNING * INTO v_new_ticket;
            
            -- Append the SAME ticket to result array N times (for printing N copies)
            v_single_ticket_json := to_jsonb(v_new_ticket);
            FOR i IN 1..v_quantity LOOP
                v_created_tickets := v_created_tickets || v_single_ticket_json;
            END LOOP;
            
        ELSE
            -- ============================================
            -- NORMAL TICKET LOGIC: Individual Codes
            -- ============================================
            FOR i IN 1..v_quantity LOOP
                -- Generate unique Code for each ticket
                v_ticket_code := v_category_prefix || '-' || date_str || '-' || batch_str || '-' || generate_random_string(4);
                
                -- Insert Ticket
                INSERT INTO tickets (
                    id, ticket_code, batch_id, category_id, category_name, 
                    status, price, nim, qr_code, created_by, created_by_name, 
                    shift, package_id, usage_count, max_usage
                ) VALUES (
                    uuid_generate_v4(),
                    v_ticket_code,
                    v_batch_id,
                    v_category_id,
                    v_category_name,
                    'UNUSED',
                    v_price,
                    CASE WHEN v_nims IS NOT NULL AND jsonb_array_length(v_nims) >= i 
                         THEN v_nims->>(i-1) 
                         ELSE NULL 
                    END,
                    'https://barcodeapi.org/api/128/' || v_ticket_code,
                    p_created_by,
                    p_created_by_name,
                    p_shift,
                    v_package_id,
                    0,
                    CASE WHEN v_is_special THEN 100 ELSE 1 END  -- Special non-package gets 100, normal gets 1
                ) RETURNING * INTO v_new_ticket;

                v_created_tickets := v_created_tickets || to_jsonb(v_new_ticket);
            END LOOP;
        END IF;
    END LOOP;

    -- Return Batch Summary
    RETURN jsonb_build_object(
        'batch_id', v_batch_id,
        'total_tickets', jsonb_array_length(v_created_tickets),
        'tickets', v_created_tickets
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
