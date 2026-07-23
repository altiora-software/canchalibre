-- Reconcile schema objects consumed by the application but absent from the
-- historical migration chain. This migration is safe to apply after a clean
-- bootstrap and to existing environments.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS fav_sports text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_whatsapp boolean NOT NULL DEFAULT true;

ALTER TYPE public.sport_type ADD VALUE IF NOT EXISTS 'padle';

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, email, avatar_url, whatsapp, city, fav_sports, notify_email, notify_whatsapp)
  ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_reservations_by_owner(owner_uuid uuid DEFAULT NULL)
RETURNS SETOF public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_profile_id uuid;
BEGIN
  SELECT id INTO v_owner_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid() AND role = 'owner';

  IF v_owner_profile_id IS NULL OR (owner_uuid IS NOT NULL AND owner_uuid <> v_owner_profile_id) THEN
    RAISE EXCEPTION 'Owner access is required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.*
  FROM public.reservations r
  JOIN public.sport_complexes c ON c.id = r.complex_id
  WHERE c.owner_id = v_owner_profile_id
  ORDER BY r.reservation_date DESC, r.start_time DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_reservations_by_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reservations_by_owner(uuid) TO authenticated;
