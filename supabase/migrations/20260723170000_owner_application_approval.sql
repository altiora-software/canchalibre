-- Owner access is granted only after an internal Cancha Libre review.
-- Public callers submit through the Edge Function using service_role; they never
-- receive an owner role, a dashboard session, or public complex visibility.

CREATE TABLE IF NOT EXISTS public.owner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'changes_requested', 'rejected', 'approved', 'invited', 'activated')),
  applicant_full_name text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text NOT NULL,
  preferred_contact text NOT NULL CHECK (preferred_contact IN ('email', 'whatsapp', 'phone')),
  relationship_to_complex text NOT NULL CHECK (relationship_to_complex IN ('owner', 'authorized_administrator', 'company_representative')),
  complex_name text NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('court_rental', 'club', 'sports_school', 'sports_center', 'other')),
  address text NOT NULL,
  neighborhood text,
  city text NOT NULL,
  province text NOT NULL,
  latitude numeric(10,8),
  longitude numeric(11,8),
  complex_phone text NOT NULL,
  complex_whatsapp text,
  sports text[] NOT NULL,
  court_count integer NOT NULL CHECK (court_count BETWEEN 1 AND 200),
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_status text NOT NULL CHECK (verification_status IN ('licensed', 'in_process', 'not_available')),
  consent_confirmed boolean NOT NULL DEFAULT false CHECK (consent_confirmed),
  applicant_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_internal_notes text,
  applicant_message text,
  reviewed_at timestamptz,
  approved_at timestamptz,
  invited_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_applications_email_format CHECK (applicant_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT owner_applications_phone_format CHECK (applicant_phone ~ '^[0-9+() -]{6,32}$'),
  CONSTRAINT owner_applications_complex_phone_format CHECK (complex_phone ~ '^[0-9+() -]{6,32}$'),
  CONSTRAINT owner_applications_whatsapp_format CHECK (complex_whatsapp IS NULL OR complex_whatsapp ~ '^[0-9+() -]{6,32}$'),
  CONSTRAINT owner_applications_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  ),
  CONSTRAINT owner_applications_sports_nonempty CHECK (cardinality(sports) BETWEEN 1 AND 16),
  CONSTRAINT owner_applications_opening_hours_object CHECK (jsonb_typeof(opening_hours) = 'object')
);

CREATE INDEX IF NOT EXISTS owner_applications_review_queue_idx
  ON public.owner_applications (status, created_at);
CREATE INDEX IF NOT EXISTS owner_applications_email_idx
  ON public.owner_applications (lower(applicant_email));
CREATE UNIQUE INDEX IF NOT EXISTS owner_applications_one_open_email_idx
  ON public.owner_applications (lower(applicant_email))
  WHERE status IN ('submitted', 'under_review', 'changes_requested', 'approved', 'invited');

ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read owner applications" ON public.owner_applications;
CREATE POLICY "Admins can read owner applications"
  ON public.owner_applications FOR SELECT
  USING (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.submit_owner_application(
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_contact_role text,
  p_preferred_contact text,
  p_complex_name text,
  p_address text,
  p_neighborhood text,
  p_city text,
  p_province text,
  p_latitude numeric,
  p_longitude numeric,
  p_public_phone text,
  p_sports text[],
  p_court_count integer,
  p_opening_hours jsonb,
  p_operation_type text,
  p_verification_status text,
  p_consent boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_email text := lower(trim(p_contact_email));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Owner applications must be submitted through the verified intake service' USING ERRCODE = '42501';
  END IF;
  IF char_length(trim(p_contact_name)) NOT BETWEEN 2 AND 120
     OR char_length(v_email) > 254
     OR char_length(trim(p_contact_phone)) > 32
     OR char_length(trim(p_complex_name)) NOT BETWEEN 2 AND 160
     OR char_length(trim(p_address)) NOT BETWEEN 5 AND 240
     OR char_length(trim(p_city)) NOT BETWEEN 2 AND 100
     OR char_length(trim(p_province)) NOT BETWEEN 2 AND 100
     OR char_length(trim(p_public_phone)) > 32
     OR p_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Invalid owner application data' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.owner_applications (
    applicant_full_name, applicant_email, applicant_phone, preferred_contact, relationship_to_complex,
    complex_name, operation_type, address, neighborhood, city, province, latitude, longitude,
    complex_phone, sports, court_count, opening_hours, verification_status, consent_confirmed
  ) VALUES (
    trim(p_contact_name), v_email, trim(p_contact_phone), p_preferred_contact, p_contact_role,
    trim(p_complex_name), p_operation_type, trim(p_address), NULLIF(trim(p_neighborhood), ''),
    trim(p_city), trim(p_province), p_latitude, p_longitude, trim(p_public_phone),
    p_sports, p_court_count, COALESCE(p_opening_hours, '{}'::jsonb), p_verification_status, true
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_owner_application(p_application_id uuid, p_internal_notes text DEFAULT NULL)
RETURNS public.owner_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.owner_applications; v_admin uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Administrator access is required' USING ERRCODE = '42501'; END IF;
  IF p_internal_notes IS NOT NULL AND char_length(trim(p_internal_notes)) > 4000 THEN RAISE EXCEPTION 'Notes are too long' USING ERRCODE = '22001'; END IF;
  SELECT id INTO v_admin FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin';
  UPDATE public.owner_applications SET status = 'under_review', reviewed_by_profile_id = v_admin,
    review_internal_notes = NULLIF(trim(p_internal_notes), ''), reviewed_at = now()
  WHERE id = p_application_id AND status IN ('submitted', 'changes_requested') RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application is not available for review' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.request_owner_application_changes(p_application_id uuid, p_message text)
RETURNS public.owner_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.owner_applications; v_admin uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Administrator access is required' USING ERRCODE = '42501'; END IF;
  IF char_length(trim(p_message)) NOT BETWEEN 2 AND 2000 THEN RAISE EXCEPTION 'A change request message is required' USING ERRCODE = '22023'; END IF;
  SELECT id INTO v_admin FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin';
  UPDATE public.owner_applications SET status = 'changes_requested', reviewed_by_profile_id = v_admin,
    applicant_message = trim(p_message), reviewed_at = now()
  WHERE id = p_application_id AND status IN ('submitted', 'under_review') RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application is not available for changes' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_owner_application(p_application_id uuid, p_reason text)
RETURNS public.owner_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.owner_applications; v_admin uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Administrator access is required' USING ERRCODE = '42501'; END IF;
  IF char_length(trim(p_reason)) NOT BETWEEN 2 AND 2000 THEN RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = '22023'; END IF;
  SELECT id INTO v_admin FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin';
  UPDATE public.owner_applications SET status = 'rejected', reviewed_by_profile_id = v_admin,
    applicant_message = trim(p_reason), reviewed_at = now()
  WHERE id = p_application_id AND status IN ('submitted', 'under_review', 'changes_requested') RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application is not available for rejection' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_owner_application(p_application_id uuid)
RETURNS public.owner_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.owner_applications; v_admin uuid; v_profile public.profiles;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Administrator access is required' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_admin FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin';
  SELECT p.* INTO v_profile FROM public.owner_applications a JOIN public.profiles p ON lower(p.email) = lower(a.applicant_email)
  WHERE a.id = p_application_id FOR UPDATE;
  -- Approval is deliberately not activation: it never changes profiles.role.
  -- The invitation/activation server flow is the only owner-role grant.
  UPDATE public.owner_applications SET status = 'approved', applicant_profile_id = v_profile.id,
    reviewed_by_profile_id = v_admin, reviewed_at = now(), approved_at = now()
  WHERE id = p_application_id AND status IN ('submitted', 'under_review') RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application is not available for approval' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END; $$;

-- Edge Functions call this only after a Supabase invitation has created the user/profile.
CREATE OR REPLACE FUNCTION public.activate_owner_application(p_application_id uuid, p_user_id uuid)
RETURNS public.owner_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.owner_applications; v_profile public.profiles;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service access is required' USING ERRCODE = '42501'; END IF;
  SELECT p.* INTO v_profile FROM public.owner_applications a JOIN public.profiles p ON p.user_id = p_user_id
  WHERE a.id = p_application_id AND lower(p.email) = lower(a.applicant_email) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation email does not match the application' USING ERRCODE = '42501'; END IF;
  PERFORM set_config('app.allow_role_change', 'true', true);
  UPDATE public.profiles SET role = CASE WHEN role = 'admin' THEN 'admin' ELSE 'owner' END WHERE id = v_profile.id;
  UPDATE public.owner_applications SET status = 'activated', applicant_profile_id = v_profile.id,
    invited_at = COALESCE(invited_at, now()), activated_at = now() WHERE id = p_application_id AND status IN ('approved', 'invited') RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application is not awaiting activation' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_owner_application_invited(p_application_id uuid)
RETURNS public.owner_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.owner_applications;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service access is required' USING ERRCODE = '42501'; END IF;
  UPDATE public.owner_applications SET status = 'invited', invited_at = now() WHERE id = p_application_id AND status = 'approved' RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application is not awaiting invitation' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END; $$;

DROP TRIGGER IF EXISTS update_owner_applications_updated_at ON public.owner_applications;
CREATE TRIGGER update_owner_applications_updated_at BEFORE UPDATE ON public.owner_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public catalog and availability require both approval and operational activation.
DROP POLICY IF EXISTS "Anyone can view approved complexes" ON public.sport_complexes;
CREATE POLICY "Anyone can view active approved complexes" ON public.sport_complexes FOR SELECT USING (is_approved = true AND is_active = true);
DROP POLICY IF EXISTS "Anyone can view courts of approved complexes" ON public.sport_courts;
CREATE POLICY "Anyone can view courts of active approved complexes" ON public.sport_courts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sport_complexes WHERE id = complex_id AND is_approved = true AND is_active = true)
);

-- No authenticated browser may self-promote; only approval/invitation server paths may do so.
REVOKE ALL ON FUNCTION public.promote_to_owner(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_to_owner(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_owner(uuid, text, text) TO service_role;
REVOKE INSERT ON public.reservations FROM authenticated;

REVOKE ALL ON TABLE public.owner_applications FROM anon, authenticated;
GRANT SELECT ON TABLE public.owner_applications TO authenticated;
REVOKE ALL ON FUNCTION public.submit_owner_application(text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,text[],integer,jsonb,text,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_owner_application(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_owner_application_changes(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_owner_application(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_owner_application(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_owner_application(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_owner_application_invited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_application(text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,text[],integer,jsonb,text,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_owner_application(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_owner_application_changes(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_owner_application(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_owner_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_owner_application(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_owner_application_invited(uuid) TO service_role;
