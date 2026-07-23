-- Public images are readable by the catalog, while writes remain scoped to the
-- authenticated profile folder or a complex owned by that profile.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('complex-photos', 'complex-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatar owners can read their upload metadata" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can delete" ON storage.objects;

CREATE POLICY "Avatar owners can read their upload metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar owners can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar owners can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar owners can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Complex owners can read photo metadata" ON storage.objects;
DROP POLICY IF EXISTS "Complex owners can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Complex owners can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Complex owners can delete photos" ON storage.objects;

CREATE POLICY "Complex owners can read photo metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'complex-photos'
    AND (
      public.is_current_user_admin()
      OR EXISTS (
        SELECT 1
        FROM public.sport_complexes complex
        JOIN public.profiles profile ON profile.id = complex.owner_id
        WHERE complex.id::text = (storage.foldername(name))[1]
          AND profile.user_id = auth.uid()
          AND profile.role = 'owner'
      )
    )
  );

CREATE POLICY "Complex owners can upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'complex-photos'
    AND (
      public.is_current_user_admin()
      OR EXISTS (
        SELECT 1
        FROM public.sport_complexes complex
        JOIN public.profiles profile ON profile.id = complex.owner_id
        WHERE complex.id::text = (storage.foldername(name))[1]
          AND profile.user_id = auth.uid()
          AND profile.role = 'owner'
      )
    )
  );

CREATE POLICY "Complex owners can update photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'complex-photos'
    AND (
      public.is_current_user_admin()
      OR EXISTS (
        SELECT 1 FROM public.sport_complexes complex JOIN public.profiles profile ON profile.id = complex.owner_id
        WHERE complex.id::text = (storage.foldername(name))[1] AND profile.user_id = auth.uid() AND profile.role = 'owner'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'complex-photos'
    AND (
      public.is_current_user_admin()
      OR EXISTS (
        SELECT 1 FROM public.sport_complexes complex JOIN public.profiles profile ON profile.id = complex.owner_id
        WHERE complex.id::text = (storage.foldername(name))[1] AND profile.user_id = auth.uid() AND profile.role = 'owner'
      )
    )
  );

CREATE POLICY "Complex owners can delete photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'complex-photos'
    AND (
      public.is_current_user_admin()
      OR EXISTS (
        SELECT 1 FROM public.sport_complexes complex JOIN public.profiles profile ON profile.id = complex.owner_id
        WHERE complex.id::text = (storage.foldername(name))[1] AND profile.user_id = auth.uid() AND profile.role = 'owner'
      )
    )
  );
