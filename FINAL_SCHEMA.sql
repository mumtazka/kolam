-- =============================================
-- Kolam Renang UNY - Final Database Schema
-- Combined Schema: Includes all tables, migrations, and policies
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'RECEPTIONIST', 'SCANNER');
CREATE TYPE ticket_status AS ENUM ('UNUSED', 'USED');

-- =============================================
-- USERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'RECEPTIONIST',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =============================================
-- CATEGORIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code_prefix VARCHAR(3) NOT NULL,
    requires_nim BOOLEAN NOT NULL DEFAULT FALSE,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Unique index for code_prefix only for non-deleted categories
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_code_prefix 
ON categories(code_prefix) 
WHERE deleted_at IS NULL;

-- =============================================
-- TICKET PACKAGES TABLE
-- =============================================

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

-- =============================================
-- SESSIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days TEXT[] NOT NULL DEFAULT '{}',
    is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- POOLS & POOL PACKAGES
-- =============================================

CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    depth_range VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    depth VARCHAR(50) NOT NULL,
    area DECIMAL(10, 2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- LOCATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TICKETS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    batch_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    category_name VARCHAR(255) NOT NULL,
    status ticket_status NOT NULL DEFAULT 'UNUSED',
    price DECIMAL(12, 2) NOT NULL,
    nim VARCHAR(50),
    qr_code TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255) NOT NULL,
    shift VARCHAR(50) NOT NULL,
    package_id UUID REFERENCES ticket_packages(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scanned_at TIMESTAMPTZ,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_batch_id ON tickets(batch_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_scanned_at ON tickets(scanned_at);
CREATE INDEX IF NOT EXISTS idx_tickets_shift ON tickets(shift);

-- =============================================
-- SCAN LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    scanned_by_name VARCHAR(255) NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category_name VARCHAR(255) NOT NULL,
    shift VARCHAR(50),
    mode_used VARCHAR(50),
    shift_label VARCHAR(50),
    role_at_scan VARCHAR(50)
);

-- Indexes for scan logs
CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket_id ON scan_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_by ON scan_logs(scanned_by);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_logs_shift_label ON scan_logs(shift_label);

-- =============================================
-- SHIFT MANAGEMENT TABLES
-- =============================================

-- Global shift state tracking
CREATE TABLE IF NOT EXISTS position_shifts (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  shift_label TEXT NOT NULL CHECK (shift_label IN ('MORNING', 'AFTERNOON')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily staff assignments
CREATE TABLE IF NOT EXISTS staff_shifts (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_label TEXT NOT NULL CHECK (shift_label IN ('MORNING', 'AFTERNOON')),
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'RECEPTIONIST', 'SCANNER', 'OFF')),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, shift_label)
);

-- Recurring weekly schedules
CREATE TABLE IF NOT EXISTS weekly_schedules (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    morning_role TEXT NOT NULL DEFAULT 'OFF' CHECK (morning_role IN ('ADMIN', 'RECEPTIONIST', 'SCANNER', 'OFF')),
    afternoon_role TEXT NOT NULL DEFAULT 'OFF' CHECK (afternoon_role IN ('ADMIN', 'RECEPTIONIST', 'SCANNER', 'OFF')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, day_of_week)
);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_packages_updated_at BEFORE UPDATE ON ticket_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper for random string generation
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

-- Transactional Ticket Creation RPC
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

-- =============================================
-- VIEWS
-- =============================================

-- Daily report view
CREATE OR REPLACE VIEW daily_ticket_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as tickets_sold,
    COUNT(*) FILTER (WHERE status = 'USED') as tickets_scanned,
    SUM(price) as total_revenue,
    category_name,
    COUNT(*) as category_count,
    SUM(price) as category_revenue
FROM tickets
GROUP BY DATE(created_at), category_name
ORDER BY DATE(created_at) DESC;

-- Staff activity view
CREATE OR REPLACE VIEW staff_activity AS
SELECT 
    created_by_name as staff_name,
    COUNT(*) as tickets_sold,
    SUM(price) as total_revenue,
    DATE(created_at) as date
FROM tickets
GROUP BY created_by_name, DATE(created_at)
ORDER BY DATE(created_at) DESC, tickets_sold DESC;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users (General policy - customize as needed)
CREATE POLICY "Allow anon read user" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access users" ON users FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon read categories" ON categories FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access categories" ON categories FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon read ticket_packages" ON ticket_packages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access ticket_packages" ON ticket_packages FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon read sessions" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access sessions" ON sessions FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon read packages" ON packages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access packages" ON packages FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon read pools" ON pools FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access pools" ON pools FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon read locations" ON locations FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access locations" ON locations FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated full access tickets" ON tickets FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated full access scan_logs" ON scan_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated full access position_shifts" ON position_shifts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read position_shifts" ON position_shifts FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access staff_shifts" ON staff_shifts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read staff_shifts" ON staff_shifts FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access weekly_schedules" ON weekly_schedules FOR ALL TO authenticated USING (true);

-- =============================================
-- SEED DATA
-- =============================================

-- Seed Users
INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES
(
    uuid_generate_v4(),
    'admin@kolamuny.ac.id',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GH5sOj0VIVnJGy',
    'Admin Kolam',
    'ADMIN',
    TRUE
),
(
    uuid_generate_v4(),
    'resepsionis@kolamuny.ac.id',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GH5sOj0VIVnJGy',
    'Petugas Loket',
    'RECEPTIONIST',
    TRUE
),
(
    uuid_generate_v4(),
    'scanner@kolamuny.ac.id',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GH5sOj0VIVnJGy',
    'Petugas Gate',
    'SCANNER',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Seed Categories
INSERT INTO categories (name, code_prefix, requires_nim, price, active, description) VALUES
    ('Umum', 'U', FALSE, 15000, TRUE, 'Tiket umum'),
    ('Mahasiswa', 'M', TRUE, 10000, TRUE, 'Mahasiswa dengan NIM'),
    ('Khusus', 'K', FALSE, 20000, TRUE, 'Tiket khusus'),
    ('Liburan', 'L', FALSE, 20000, TRUE, 'Tiket hari libur (Sabtu & Minggu)'),
    ('VIP', 'VIP', FALSE, 50000, TRUE, 'Tiket VIP dengan akses premium'),
    ('Event', 'EVT', FALSE, 25000, FALSE, 'Tiket event khusus')
ON CONFLICT (code_prefix) WHERE deleted_at IS NULL DO NOTHING;

-- Seed Pool Packages
INSERT INTO packages (name, depth_range, description) VALUES
    ('PAUD', '0-40 cm', 'Kolam anak usia dini'),
    ('SD', '40-100 cm', 'Kolam anak SD'),
    ('SMP', '100-150 cm', 'Kolam remaja'),
    ('Pemanasan', 'Dangkal', 'Kolam pemanasan'),
    ('Khusus', 'Custom', 'Kolam khusus');
