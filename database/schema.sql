-- =============================================
-- Kolam Renang UNY - Sistem Tiket
-- Supabase PostgreSQL Schema
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

CREATE TABLE users (
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- =============================================
-- CATEGORIES TABLE
-- =============================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code_prefix VARCHAR(3) NOT NULL UNIQUE,
    requires_nim BOOLEAN NOT NULL DEFAULT FALSE,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PRICES TABLE
-- =============================================

CREATE TABLE prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    price DECIMAL(12, 2) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(category_id)
);

-- Index for category lookup
CREATE INDEX idx_prices_category_id ON prices(category_id);

-- =============================================
-- SESSIONS TABLE
-- =============================================

CREATE TABLE sessions (
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
-- PACKAGES TABLE
-- =============================================

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    depth_range VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- LOCATIONS TABLE
-- =============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TICKETS TABLE
-- =============================================

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    batch_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    category_name VARCHAR(255) NOT NULL,
    status ticket_status NOT NULL DEFAULT 'UNUSED',
    price DECIMAL(12, 2) NOT NULL,
    nim VARCHAR(50),
    qr_code TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_by_name VARCHAR(255) NOT NULL,
    shift VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scanned_at TIMESTAMPTZ,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_batch_id ON tickets(batch_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_category_id ON tickets(category_id);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_scanned_at ON tickets(scanned_at);
CREATE INDEX idx_tickets_shift ON tickets(shift);

-- =============================================
-- SCAN LOGS TABLE
-- =============================================

CREATE TABLE scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    scanned_by_name VARCHAR(255) NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category_name VARCHAR(255) NOT NULL
);

-- Index for scan logs
CREATE INDEX idx_scan_logs_ticket_id ON scan_logs(ticket_id);
CREATE INDEX idx_scan_logs_scanned_by ON scan_logs(scanned_by);
CREATE INDEX idx_scan_logs_scanned_at ON scan_logs(scanned_at);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Users table policies (allow anon to read for login)
CREATE POLICY "Allow anon read users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated read users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert users" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update users" ON users FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete users" ON users FOR DELETE TO authenticated USING (true);

-- Categories policies
CREATE POLICY "Allow anon read categories" ON categories FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated select categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update categories" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete categories" ON categories FOR DELETE TO authenticated USING (true);

-- Prices policies
CREATE POLICY "Allow anon read prices" ON prices FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated select prices" ON prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert prices" ON prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update prices" ON prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete prices" ON prices FOR DELETE TO authenticated USING (true);

-- Sessions policies
CREATE POLICY "Allow anon read sessions" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated select sessions" ON sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert sessions" ON sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update sessions" ON sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete sessions" ON sessions FOR DELETE TO authenticated USING (true);

-- Packages policies
CREATE POLICY "Allow anon read packages" ON packages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated select packages" ON packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert packages" ON packages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update packages" ON packages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete packages" ON packages FOR DELETE TO authenticated USING (true);

-- Locations policies
CREATE POLICY "Allow anon read locations" ON locations FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated select locations" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert locations" ON locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update locations" ON locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete locations" ON locations FOR DELETE TO authenticated USING (true);

-- Tickets policies
CREATE POLICY "Allow anon read tickets" ON tickets FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated select tickets" ON tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert tickets" ON tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update tickets" ON tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete tickets" ON tickets FOR DELETE TO authenticated USING (true);

-- Scan logs policies
CREATE POLICY "Allow anon read scan_logs" ON scan_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated select scan_logs" ON scan_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert scan_logs" ON scan_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update scan_logs" ON scan_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete scan_logs" ON scan_logs FOR DELETE TO authenticated USING (true);

-- =============================================
-- SEED DATA
-- =============================================

-- =============================================
-- SEED USERS (1 per role)
-- =============================================
-- Password for all users: admin123
-- BCrypt hash generated with cost factor 12

-- ADMIN User
INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES
(
    uuid_generate_v4(),
    'admin@kolamuny.ac.id',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GH5sOj0VIVnJGy',
    'Admin Kolam',
    'ADMIN',
    TRUE
);

-- RECEPTIONIST User
INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES
(
    uuid_generate_v4(),
    'resepsionis@kolamuny.ac.id',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GH5sOj0VIVnJGy',
    'Petugas Loket',
    'RECEPTIONIST',
    TRUE
);

-- SCANNER User
INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES
(
    uuid_generate_v4(),
    'scanner@kolamuny.ac.id',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GH5sOj0VIVnJGy',
    'Petugas Gate',
    'SCANNER',
    TRUE
);

-- Insert default categories with prefixes and prices
INSERT INTO categories (name, code_prefix, requires_nim, price, active, description) VALUES
    ('Umum', 'U', FALSE, 15000, TRUE, 'Tiket umum'),
    ('Mahasiswa', 'M', TRUE, 10000, TRUE, 'Mahasiswa dengan NIM'),
    ('Khusus', 'K', FALSE, 20000, TRUE, 'Tiket khusus'),
    ('Liburan', 'L', FALSE, 20000, TRUE, 'Tiket hari libur (Sabtu & Minggu)'),
    ('VIP', 'VIP', FALSE, 50000, TRUE, 'Tiket VIP dengan akses premium'),
    ('Event', 'EVT', FALSE, 25000, FALSE, 'Tiket event khusus');

-- Insert default packages
INSERT INTO packages (name, depth_range, description) VALUES
    ('PAUD', '0-40 cm', 'Kolam anak usia dini'),
    ('SD', '40-100 cm', 'Kolam anak SD'),
    ('SMP', '100-150 cm', 'Kolam remaja'),
    ('Pemanasan', 'Dangkal', 'Kolam pemanasan'),
    ('Khusus', 'Custom', 'Kolam khusus');

-- =============================================
-- HELPFUL VIEWS
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
-- POOLS TABLE
-- =============================================

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
-- POOLS RLS
-- =============================================

ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read pools" ON pools FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated select pools" ON pools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert pools" ON pools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update pools" ON pools FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete pools" ON pools FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

