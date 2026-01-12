-- Rename locations table to pools
ALTER TABLE locations RENAME TO pools;

-- Modify pools table structure
ALTER TABLE pools ADD COLUMN depth VARCHAR(255);
ALTER TABLE pools ADD COLUMN area DECIMAL(10, 2);
ALTER TABLE pools ADD COLUMN description TEXT;
ALTER TABLE pools ADD COLUMN active BOOLEAN DEFAULT TRUE;
ALTER TABLE pools DROP COLUMN IF EXISTS capacity;

-- Add relations to other tables
ALTER TABLE packages ADD COLUMN pool_id UUID REFERENCES pools(id);
ALTER TABLE sessions ADD COLUMN pool_id UUID REFERENCES pools(id);
ALTER TABLE scan_logs ADD COLUMN pool_id UUID REFERENCES pools(id);

-- enable RLS for new table name (Postgres usually handles this, but good to ensure)
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

-- Re-create policies (if renaming drops them, though usually they persist or need adjustment)
-- Dropping old policies just in case to avoid confusion with old names
DROP POLICY IF EXISTS "Allow anon read locations" ON pools;
DROP POLICY IF EXISTS "Allow authenticated all locations" ON pools;

CREATE POLICY "Allow anon read pools" ON pools FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated all pools" ON pools FOR ALL TO authenticated USING (true);

-- Insert seed data for Pools if empty
INSERT INTO pools (name, depth, area, description, active)
SELECT 'Kolam Anak', '40 cm', 100.00, 'Kolam untuk anak-anak', TRUE
WHERE NOT EXISTS (SELECT 1 FROM pools);

INSERT INTO pools (name, depth, area, description, active)
SELECT 'Kolam Dewasa', '120-180 cm', 400.00, 'Kolam standar dewasa', TRUE
WHERE NOT EXISTS (SELECT 1 FROM pools WHERE name = 'Kolam Dewasa');
