# Cara Menjalankan Migration

## 1. Migration Session Tickets

File: `migration_session_tickets.sql`

### Menggunakan Supabase Dashboard:
1. Login ke dashboard Supabase Anda
2. Pilih project Anda
3. Klik "SQL Editor" di sidebar
4. Klik "New Query"
5. Copy paste isi file `migration_session_tickets.sql`
6. Klik "Run" atau tekan Ctrl+Enter

### Menggunakan psql Command Line:
```bash
psql -h [your-supabase-host] -U postgres -d postgres -f migration_session_tickets.sql
```

### Menggunakan Supabase CLI:
```bash
supabase db reset
# atau
supabase db push
```

## 2. Verifikasi Migration

Setelah menjalankan migration, jalankan query ini untuk verifikasi:

```sql
-- Check if columns added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND column_name IN ('session_id', 'booking_date');

-- Check migrated data
SELECT 
    c.id,
    c.name,
    c.code_prefix,
    c.session_id,
    c.booking_date,
    s.name as session_name,
    s.is_recurring
FROM categories c
LEFT JOIN sessions s ON c.session_id = s.id
WHERE c.session_id IS NOT NULL;
```

## 3. Rollback (Jika Diperlukan)

Jika ada masalah dan ingin rollback:

```sql
-- Remove foreign key constraint and columns
ALTER TABLE categories DROP COLUMN IF EXISTS session_id CASCADE;
ALTER TABLE categories DROP COLUMN IF EXISTS booking_date;

-- Drop indexes
DROP INDEX IF EXISTS idx_categories_session_id;
DROP INDEX IF EXISTS idx_categories_booking_date;
```

## Catatan Penting

- ✅ Migration ini **aman** - menambahkan kolom dengan NULL, tidak mengubah data existing
- ✅ Data existing di field `description` akan **otomatis dimigrasikan** ke kolom baru
- ✅ Backward compatible - kode lama tetap berjalan sambil migration
- ✅ Setelah migration, data akan lebih terstruktur dan query lebih cepat
