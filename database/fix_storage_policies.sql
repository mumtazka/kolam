-- Enable RLS on storage.objects if not already enabled (it usually is)
-- alter table storage.objects enable row level security;

-- Policy: Allow Public Read Access
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'pool-images' );

-- Policy: Allow Authenticated Users (Admins) to Upload
create policy "Authenticated Upload"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'pool-images' );

-- Policy: Allow Authenticated Users to Update
create policy "Authenticated Update"
on storage.objects for update
to authenticated
using ( bucket_id = 'pool-images' );

-- Policy: Allow Authenticated Users to Delete
create policy "Authenticated Delete"
on storage.objects for delete
to authenticated
using ( bucket_id = 'pool-images' );
