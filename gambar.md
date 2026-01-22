-- Allow anyone to read (public)
CREATE POLICY "Public read pool-images" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'pool-images');

-- Allow authenticated to upload
CREATE POLICY "Authenticated upload pool-images" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'pool-images');

-- Allow authenticated to update
CREATE POLICY "Authenticated update pool-images" ON storage.objects
FOR UPDATE TO anon, authenticated
USING (bucket_id = 'pool-images');

-- Allow authenticated to delete
CREATE POLICY "Authenticated delete pool-images" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'pool-images');
