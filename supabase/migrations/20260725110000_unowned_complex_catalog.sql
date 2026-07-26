-- Preloaded catalog entries can exist before their commercial owner profile is created.
-- Ownership may only be assigned later by an administrator through the RPC below.

ALTER TABLE public.sport_complexes
  ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.sport_complexes
  DROP CONSTRAINT IF EXISTS sport_complexes_owner_id_fkey;

ALTER TABLE public.sport_complexes
  ADD CONSTRAINT sport_complexes_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.assign_complex_owner(
  p_complex_id uuid,
  p_owner_profile_id uuid
)
RETURNS public.sport_complexes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_complex public.sport_complexes;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Administrator access is required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_owner_profile_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Target profile must exist and have owner role' USING ERRCODE = '22023';
  END IF;

  UPDATE public.sport_complexes
     SET owner_id = p_owner_profile_id
   WHERE id = p_complex_id
   RETURNING * INTO v_complex;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complex not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_complex;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_complex_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_complex_owner(uuid, uuid) TO authenticated;
