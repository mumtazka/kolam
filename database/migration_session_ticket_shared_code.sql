-- =============================================
-- Migration: Session Ticket Shared Code Feature
-- When session tickets (categories with session_id) are printed in quantity,
-- they should share ONE code with max_usage = quantity.
-- The quantity column in reports will show: usage_count/max_usage (e.g., 2/25)
-- Run this in Supabase SQL Editor
-- =============================================

-- First, ensure max_usage column exists on tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 1;

-- Replace the process_ticket_transaction function to handle session tickets properly
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
    v_category_session_id UUID;
    v_price DECIMAL;
    v_ticket_code TEXT;
    v_created_tickets JSONB := '[]'::JSONB;
    v_new_ticket RECORD;
    v_single_ticket_json JSONB;
    i INTEGER;
    date_str TEXT;
    batch_str TEXT;
    v_is_session_ticket BOOLEAN;
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

        -- Get Base Category Details including session_id
        SELECT name, code_prefix, price, session_id 
        INTO v_category_name, v_category_prefix, v_price, v_category_session_id
        FROM categories WHERE id = v_category_id;
        
        -- Determine if this is a session ticket (has session_id)
        v_is_session_ticket := (v_category_session_id IS NOT NULL);
        
        -- Override price if this is a Package item
        IF v_package_id IS NOT NULL THEN
             SELECT price_per_person INTO v_price FROM ticket_packages WHERE id = v_package_id;
        END IF;

        -- ============================================
        -- SESSION TICKET LOGIC: Same Code, Multiple Prints
        -- When a session ticket is printed with quantity > 1,
        -- create ONE ticket with max_usage = quantity
        -- ============================================
        IF v_is_session_ticket AND v_quantity > 1 THEN
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
                NULL, -- No NIM for session tickets with shared code
                'https://barcodeapi.org/api/128/' || v_ticket_code,
                p_created_by,
                p_created_by_name,
                p_shift,
                v_package_id,
                0,
                v_quantity  -- max_usage = number of people/prints
            ) RETURNING * INTO v_new_ticket;
            
            -- Append the SAME ticket to result array N times (for printing N copies)
            v_single_ticket_json := to_jsonb(v_new_ticket);
            FOR i IN 1..v_quantity LOOP
                v_created_tickets := v_created_tickets || v_single_ticket_json;
            END LOOP;
            
        ELSE
            -- ============================================
            -- NORMAL TICKET LOGIC: Individual Codes
            -- For regular categories or single session tickets
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
                    CASE WHEN v_is_session_ticket THEN 1 ELSE 1 END  -- Single tickets have max_usage = 1
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

-- =============================================
-- Verification: Check the function was created
-- =============================================
-- Run this to verify:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'process_ticket_transaction';
