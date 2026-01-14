-- Add is_group_ticket column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_group_ticket BOOLEAN DEFAULT FALSE;

-- Add quantity and total_price columns to scan_logs table
ALTER TABLE scan_logs 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2) DEFAULT 0;

-- Optional: Add a comment
COMMENT ON COLUMN categories.is_group_ticket IS 'Flag to indicate if this category allows multiple people per ticket (up to 100)';
