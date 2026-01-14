-- =============================================
-- Migration: Ticket Packages and RPC
-- =============================================

-- 1. Create ticket_packages table
CREATE TABLE IF NOT EXISTS ticket_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    min_people INTEGER NOT NULL DEFAULT 1,
    price_per_person DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for ticket_packages
ALTER TABLE ticket_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read ticket_packages" ON ticket_packages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access ticket_packages" ON ticket_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_ticket_packages_updated_at BEFORE UPDATE ON ticket_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 2. Modify tickets table
-- Add usage_count for multi-scan support (e.g. max 100 for Special tickets)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
-- Add package_id to track which package generated this ticket
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES ticket_packages(id) ON DELETE SET NULL;


-- 3. Create helper for random string generation (Alphanumeric)
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


-- 4. Create or Replace RPC for Batch Ticket Creation
-- This function handles the complex logic of generating standardized codes, 
-- calculating prices (category vs package), and creating multiple records transactionally.

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
    v_nims JSONB; -- array of strings
    v_category_name TEXT;
    v_category_prefix TEXT;
    v_price DECIMAL;
    v_ticket_code TEXT;
    v_created_tickets JSONB := '[]'::JSONB;
    v_new_ticket RECORD;
    i INTEGER;
    date_str TEXT;
    batch_str TEXT;
BEGIN
    -- Generate new Batch ID
    v_batch_id := uuid_generate_v4();
    
    -- Calculate Batch Number for today (Count distinct batches + 1)
    -- This generates a running number for the day e.g. 0001, 0002...
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
        
        -- Handle optional fields safely
        IF (v_item->>'package_id') IS NULL THEN
            v_package_id := NULL;
        ELSE
            v_package_id := (v_item->>'package_id')::UUID;
        END IF;

        v_nims := v_item->'nims'; -- might be null

        -- Get Base Category Details
        SELECT name, code_prefix, price INTO v_category_name, v_category_prefix, v_price
        FROM categories WHERE id = v_category_id;
        
        -- Override price if this is a Package item
        IF v_package_id IS NOT NULL THEN
             SELECT price_per_person INTO v_price FROM ticket_packages WHERE id = v_package_id;
        END IF;

        -- Generate individual tickets
        FOR i IN 1..v_quantity LOOP
            -- Generate Code: PREFIX-YYYYMMDD-BATCH-RANDOM
            v_ticket_code := v_category_prefix || '-' || date_str || '-' || batch_str || '-' || generate_random_string(4);
            
            -- Insert Ticket
            INSERT INTO tickets (
                id, ticket_code, batch_id, category_id, category_name, 
                status, price, nim, qr_code, created_by, created_by_name, 
                shift, package_id, usage_count
            ) VALUES (
                uuid_generate_v4(),
                v_ticket_code,
                v_batch_id,
                v_category_id,
                v_category_name,
                'UNUSED',
                v_price,
                -- Extract NIM if available for this index
                CASE WHEN v_nims IS NOT NULL AND jsonb_array_length(v_nims) >= i 
                     THEN v_nims->>(i-1) 
                     ELSE NULL 
                END,
                'https://barcodeapi.org/api/128/' || v_ticket_code,
                p_created_by,
                p_created_by_name,
                p_shift,
                v_package_id,
                0
            ) RETURNING * INTO v_new_ticket;

            -- Append to result array
            v_created_tickets := v_created_tickets || to_jsonb(v_new_ticket);
        END LOOP;
    END LOOP;

    -- Return Batch Summary
    RETURN jsonb_build_object(
        'batch_id', v_batch_id,
        'total_tickets', jsonb_array_length(v_created_tickets),
        'tickets', v_created_tickets
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
