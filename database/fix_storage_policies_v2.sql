-- BRUTE FORCE FIX FOR STORAGE POLICIES
-- Run this in Supabase SQL Editor

-- 1. Enable RLS (just in case)
alter table storage.objects enable row level security;

-- 2. DROP existing policies to avoid conflicts
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Authenticated Update" on storage.objects;
drop policy if exists "Authenticated Delete" on storage.objects;
drop policy if exists "Public Access Pool Images" on storage.objects;
drop policy if exists "Authenticated Upload Pool Images" on storage.objects;
drop policy if exists "Authenticated Update Pool Images" on storage.objects;
drop policy if exists "Authenticated Delete Pool Images" on storage.objects;

-- 3. RE-CREATE Policies

-- Allow PUBLIC read access to 'pool-images'
create policy "Public Access Pool Images"
on storage.objects for select
using ( bucket_id = 'pool-images' );

-- Allow AUTHENTICATED users to INSERT
create policy "Authenticated Upload Pool Images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'pool-images' );

-- Allow AUTHENTICATED users to UPDATE
create policy "Authenticated Update Pool Images"
on storage.objects for update
to authenticated
using ( bucket_id = 'pool-images' );

-- Allow AUTHENTICATED users to DELETE
create policy "Authenticated Delete Pool Images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'pool-images' );

-- 4. Verify Bucket (This is SQL-only, ensure you toggled "Public" in UI)
-- update storage.buckets set public = true where id = 'pool-images';
