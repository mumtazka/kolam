BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role TEXT NOT NULL DEFAULT 'RECEPTIONIST' CHECK (role IN ('ADMIN', 'RECEPTIONIST', 'SCANNER')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days TEXT[] DEFAULT '{}',
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    pool_id UUID,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_pool_id ON sessions(pool_id);
CREATE INDEX idx_sessions_valid_until ON sessions(valid_until);

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    depth VARCHAR(255),
    area DECIMAL(10, 2),
    description TEXT,
    image_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sessions ADD CONSTRAINT sessions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE SET NULL;

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code_prefix VARCHAR(10) NOT NULL,
    requires_nim BOOLEAN NOT NULL DEFAULT FALSE,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    booking_date DATE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_unique_active_code_prefix ON categories(code_prefix) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_session_id ON categories(session_id);
CREATE INDEX idx_categories_booking_date ON categories(booking_date);
CREATE INDEX idx_categories_active ON categories(active);

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE ticket_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    min_people INTEGER NOT NULL DEFAULT 1,
    price_per_person DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    pool_id UUID REFERENCES pools(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_ticket_packages_updated_at BEFORE UPDATE ON ticket_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    batch_id UUID NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_name VARCHAR(255),
    status TEXT NOT NULL DEFAULT 'UNUSED' CHECK (status IN ('UNUSED', 'USED', 'CANCELLED')),
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    nim VARCHAR(50),
    qr_code TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    shift VARCHAR(50),
    package_id UUID REFERENCES ticket_packages(id) ON DELETE SET NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    max_usage INTEGER NOT NULL DEFAULT 1,
    scanned_at TIMESTAMPTZ,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_batch_id ON tickets(batch_id);
CREATE INDEX idx_tickets_category_id ON tickets(category_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_shift ON tickets(shift);

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    scanned_by_name VARCHAR(255),
    category_name VARCHAR(255),
    shift VARCHAR(50),
    shift_label VARCHAR(50),
    role_at_scan TEXT,
    mode_used VARCHAR(50),
    pool_id UUID REFERENCES pools(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_logs_ticket_id ON scan_logs(ticket_id);
CREATE INDEX idx_scan_logs_scanned_by ON scan_logs(scanned_by);
CREATE INDEX idx_scan_logs_created_at ON scan_logs(created_at);
CREATE INDEX idx_scan_logs_shift_label ON scan_logs(shift_label);
CREATE INDEX idx_scan_logs_role_at_scan ON scan_logs(role_at_scan);

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pool_id UUID REFERENCES pools(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE position_shifts (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    shift_label TEXT NOT NULL CHECK (shift_label IN ('MORNING', 'AFTERNOON')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_position_shifts_date ON position_shifts(date);

CREATE TABLE staff_shifts (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift_label TEXT NOT NULL CHECK (shift_label IN ('MORNING', 'AFTERNOON')),
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'RECEPTIONIST', 'SCANNER', 'OFF')),
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date, shift_label)
);

CREATE INDEX idx_staff_shifts_user_id ON staff_shifts(user_id);
CREATE INDEX idx_staff_shifts_date ON staff_shifts(date);

CREATE TABLE weekly_schedules (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    morning_role TEXT NOT NULL DEFAULT 'OFF' CHECK (morning_role IN ('ADMIN', 'RECEPTIONIST', 'SCANNER', 'OFF')),
    afternoon_role TEXT NOT NULL DEFAULT 'OFF' CHECK (afternoon_role IN ('ADMIN', 'RECEPTIONIST', 'SCANNER', 'OFF')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, day_of_week)
);

CREATE INDEX idx_weekly_schedules_user_id ON weekly_schedules(user_id);

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

CREATE OR REPLACE FUNCTION process_ticket_transaction(
    p_items JSONB,
    p_created_by UUID,
    p_created_by_name TEXT,
    p_shift TEXT
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
    v_batch_id := gen_random_uuid();
    
    SELECT COALESCE(COUNT(DISTINCT batch_id), 0) + 1 INTO v_batch_number
    FROM tickets 
    WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + 1;

    date_str := to_char(NOW(), 'YYYYMMDD');
    batch_str := lpad(v_batch_number::text, 4, '0');

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_category_id := (v_item->>'category_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        IF (v_item->>'package_id') IS NULL OR (v_item->>'package_id') = '' THEN
            v_package_id := NULL;
        ELSE
            v_package_id := (v_item->>'package_id')::UUID;
        END IF;

        v_nims := v_item->'nims';

        SELECT name, code_prefix, price, session_id 
        INTO v_category_name, v_category_prefix, v_price, v_category_session_id
        FROM categories WHERE id = v_category_id;
        
        v_is_session_ticket := (v_category_session_id IS NOT NULL);
        
        IF v_package_id IS NOT NULL THEN
             SELECT price_per_person INTO v_price FROM ticket_packages WHERE id = v_package_id;
        END IF;

        IF v_is_session_ticket AND v_quantity > 1 THEN
            v_ticket_code := v_category_prefix || '-' || date_str || '-' || batch_str || '-' || generate_random_string(4);
            
            INSERT INTO tickets (
                id, ticket_code, batch_id, category_id, category_name, 
                status, price, nim, qr_code, created_by, created_by_name, 
                shift, package_id, usage_count, max_usage
            ) VALUES (
                gen_random_uuid(),
                v_ticket_code,
                v_batch_id,
                v_category_id,
                v_category_name,
                'UNUSED',
                v_price,
                NULL,
                'https://barcodeapi.org/api/128/' || v_ticket_code,
                p_created_by,
                p_created_by_name,
                p_shift,
                v_package_id,
                0,
                v_quantity
            ) RETURNING * INTO v_new_ticket;
            
            v_single_ticket_json := to_jsonb(v_new_ticket);
            FOR i IN 1..v_quantity LOOP
                v_created_tickets := v_created_tickets || v_single_ticket_json;
            END LOOP;
            
        ELSE
            FOR i IN 1..v_quantity LOOP
                v_ticket_code := v_category_prefix || '-' || date_str || '-' || batch_str || '-' || generate_random_string(4);
                
                INSERT INTO tickets (
                    id, ticket_code, batch_id, category_id, category_name, 
                    status, price, nim, qr_code, created_by, created_by_name, 
                    shift, package_id, usage_count, max_usage
                ) VALUES (
                    gen_random_uuid(),
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
                    1
                ) RETURNING * INTO v_new_ticket;

                v_created_tickets := v_created_tickets || to_jsonb(v_new_ticket);
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'batch_id', v_batch_id,
        'total_tickets', jsonb_array_length(v_created_tickets),
        'tickets', v_created_tickets
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_sessions" ON sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_sessions" ON sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_pools" ON pools FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_pools" ON pools FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_categories" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_ticket_packages" ON ticket_packages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_ticket_packages" ON ticket_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_tickets" ON tickets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_tickets" ON tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_scan_logs" ON scan_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_scan_logs" ON scan_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_packages" ON packages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_packages" ON packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_position_shifts" ON position_shifts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_position_shifts" ON position_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_staff_shifts" ON staff_shifts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_staff_shifts" ON staff_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_weekly_schedules" ON weekly_schedules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_weekly_schedules" ON weekly_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@kolamuny.ac.id', '$2b$12$t4jgDb70VS/LdipRifKNCOiQGECNhTsdpN3NG7sO50o4BQUlb89Gq', 'Administrator', 'ADMIN', true),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'resepsionis@kolamuny.ac.id', '$2b$12$t4jgDb70VS/LdipRifKNCOiQGECNhTsdpN3NG7sO50o4BQUlb89Gq', 'Resepsionis Satu', 'RECEPTIONIST', true),
('c3d4e5f6-a7b8-9012-cdef-345678901234', 'scanner@kolamuny.ac.id', '$2b$12$t4jgDb70VS/LdipRifKNCOiQGECNhTsdpN3NG7sO50o4BQUlb89Gq', 'Scanner Satu', 'SCANNER', true);

INSERT INTO pools (id, name, depth, area, description, active) VALUES
('d4e5f6a7-b8c9-0123-def4-567890123456', 'Kolam Anak', '40 cm', 100.00, 'Kolam untuk anak-anak', true),
('e5f6a7b8-c9d0-1234-efa5-678901234567', 'Kolam Dewasa', '120-180 cm', 400.00, 'Kolam standar dewasa', true);

INSERT INTO sessions (id, name, start_time, end_time, days, is_recurring, pool_id) VALUES
('f6a7b8c9-d0e1-2345-fab6-789012345678', 'Sesi Pagi', '08:00', '12:00', '{"Monday","Tuesday","Wednesday","Thursday","Friday"}', true, 'e5f6a7b8-c9d0-1234-efa5-678901234567'),
('a7b8c9d0-e1f2-3456-abc7-890123456789', 'Sesi Siang', '13:00', '17:00', '{"Saturday","Sunday"}', true, 'e5f6a7b8-c9d0-1234-efa5-678901234567');

INSERT INTO categories (id, name, code_prefix, requires_nim, price, active, description) VALUES
('b8c9d0e1-f2a3-4567-bcd8-901234567890', 'Umum', 'U', false, 15000.00, true, 'Tiket untuk umum'),
('c9d0e1f2-a3b4-5678-cde9-012345678901', 'Mahasiswa', 'M', true, 10000.00, true, 'Tiket khusus mahasiswa dengan NIM'),
('d0e1f2a3-b4c5-6789-def0-123456789012', 'Liburan', 'L', false, 20000.00, true, 'Tiket hari libur');

INSERT INTO ticket_packages (id, name, min_people, price_per_person, is_active, description, pool_id) VALUES
('e1f2a3b4-c5d6-7890-efa1-234567890123', 'Paket Keluarga', 4, 12000.00, true, 'Paket hemat untuk keluarga minimal 4 orang', 'e5f6a7b8-c9d0-1234-efa5-678901234567'),
('f2a3b4c5-d6e7-8901-fab2-345678901234', 'Paket Rombongan', 10, 8000.00, true, 'Paket rombongan minimal 10 orang', 'e5f6a7b8-c9d0-1234-efa5-678901234567');

INSERT INTO position_shifts (shift_label, date, changed_by) VALUES
('MORNING', CURRENT_DATE, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

INSERT INTO weekly_schedules (user_id, day_of_week, morning_role, afternoon_role) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Monday', 'ADMIN', 'ADMIN'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tuesday', 'ADMIN', 'ADMIN'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Monday', 'RECEPTIONIST', 'OFF'),
('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Monday', 'OFF', 'SCANNER');

COMMIT;
