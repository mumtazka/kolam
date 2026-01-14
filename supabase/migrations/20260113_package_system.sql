-- Update packages table for Group/Special Packages
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS min_people INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS price_per_person DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Add package_id to tickets for tracking
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES packages(id);

-- Optional: Comment
COMMENT ON COLUMN packages.min_people IS 'Minimum number of people required for this package';
COMMENT ON COLUMN packages.price_per_person IS 'Discounted price per person for this package';
