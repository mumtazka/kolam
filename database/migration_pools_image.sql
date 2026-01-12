-- Add image_url to pools table
ALTER TABLE pools ADD COLUMN image_url TEXT;

-- NOTE: You must create a public storage bucket named 'pool-images' in Supabase Dashboard.
-- Policy to allow public read access to the bucket 'pool-images'
-- This SQL might not work directly in all Supabase SQL editors if they don't support storage API via SQL, 
-- but it's good documentation.

-- insert into storage.buckets (id, name, public) values ('pool-images', 'pool-images', true);

-- Policy for reading images
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'pool-images' );

-- Policy for authenticated uploads (Admin/Receptionist/Scanner? Probably only Admin)
-- create policy "Authenticated Upload" on storage.objects for insert to authenticated with check ( bucket_id = 'pool-images' );

-- Policy for authenticated updates
-- create policy "Authenticated Update" on storage.objects for update to authenticated using ( bucket_id = 'pool-images' );

-- Policy for authenticated deletes
-- create policy "Authenticated Delete" on storage.objects for delete to authenticated using ( bucket_id = 'pool-images' );
