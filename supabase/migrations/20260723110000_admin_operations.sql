-- Administrative operations are versioned RPCs. They use the same profiles.role
-- authority as RLS and never derive authority from client-controlled JWT metadata.

ALTER TABLE public.sport_complexes
  DROP CONSTRAINT IF EXISTS sport_complexes_payment_status_check;

ALTER TABLE public.sport_complexes
  ADD CONSTRAINT sport_complexes_payment_status_check
  CHECK (payment_status IN ('pending', 'trial', 'active', 'suspended', 'expired', 'paid', 'overdue'));

CREATE OR REPLACE FUNCTION public.approve_complex(
  p_complex_id uuid,
  p_trial_days integer DEFAULT 15
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
  IF p_trial_days < 1 OR p_trial_days > 90 THEN
    RAISE EXCEPTION 'Trial period must be between 1 and 90 days' USING ERRCODE = '22023';
  END IF;

  UPDATE public.sport_complexes
     SET is_approved = true,
         is_active = true,
         payment_status = 'trial',
         subscription_expires_at = now() + make_interval(days => p_trial_days)
   WHERE id = p_complex_id
   RETURNING * INTO v_complex;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complex not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_complex;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_complex(
  p_complex_id uuid,
  p_reason text DEFAULT NULL
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
  IF p_reason IS NOT NULL AND char_length(trim(p_reason)) > 1_000 THEN
    RAISE EXCEPTION 'Rejection reason is too long' USING ERRCODE = '22001';
  END IF;

  UPDATE public.sport_complexes
     SET is_approved = false,
         is_active = false,
         payment_status = 'suspended',
         subscription_expires_at = NULL
   WHERE id = p_complex_id
   RETURNING * INTO v_complex;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complex not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_complex;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_complex(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_complex(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_complex(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_complex(uuid, text) TO authenticated;
