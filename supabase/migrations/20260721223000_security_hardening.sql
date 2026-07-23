-- Security hardening: roles, ownership, and reservations.
-- Apply this migration before deploying a client that calls create_reservation().

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner_of_complex(p_complex_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sport_complexes AS complex
    JOIN public.profiles AS profile ON profile.id = complex.owner_id
    WHERE complex.id = p_complex_id
      AND profile.user_id = auth.uid()
      AND profile.role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Profile user_id cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() <> 'service_role'
     AND current_setting('app.allow_role_change', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Profile role can only be changed through an authorized function' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_changes ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_changes();

-- New accounts are always customers. Never trust role values from client metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    'customer'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Used by the authenticated owner onboarding flow and by the service-role Edge Function.
CREATE OR REPLACE FUNCTION public.promote_to_owner(
  p_user uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'You may only promote your own profile' USING ERRCODE = '42501';
  END IF;

  IF p_full_name IS NOT NULL AND char_length(trim(p_full_name)) > 120 THEN
    RAISE EXCEPTION 'Full name is too long' USING ERRCODE = '22001';
  END IF;
  IF p_phone IS NOT NULL AND p_phone !~ '^[0-9+() -]{6,32}$' THEN
    RAISE EXCEPTION 'Phone has an invalid format' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.allow_role_change', 'true', true);
  UPDATE public.profiles
     SET role = CASE WHEN role = 'admin' THEN 'admin' ELSE 'owner' END,
         full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
         phone = COALESCE(NULLIF(regexp_replace(p_phone, '[^0-9+]', '', 'g'), ''), phone)
   WHERE user_id = p_user
   RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_court_id uuid,
  p_reservation_date date,
  p_start_time time,
  p_end_time time,
  p_payment_method text,
  p_notes text DEFAULT NULL
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_court public.sport_courts%ROWTYPE;
  v_complex public.sport_complexes%ROWTYPE;
  v_total_price numeric(12,2);
  v_deposit_amount numeric(12,2);
  v_reservation public.reservations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF p_reservation_date < current_date OR p_reservation_date > current_date + 90 THEN
    RAISE EXCEPTION 'Reservation date must be within the next 90 days' USING ERRCODE = '22023';
  END IF;
  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'End time must be after start time' USING ERRCODE = '22023';
  END IF;
  IF p_payment_method NOT IN ('mercado_pago', 'transfer', 'cash') THEN
    RAISE EXCEPTION 'Unsupported payment method' USING ERRCODE = '22023';
  END IF;
  IF p_notes IS NOT NULL AND char_length(p_notes) > 1000 THEN
    RAISE EXCEPTION 'Notes are too long' USING ERRCODE = '22001';
  END IF;

  SELECT * INTO v_court FROM public.sport_courts WHERE id = p_court_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Court is not available' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_complex FROM public.sport_complexes
   WHERE id = v_court.complex_id AND is_active = true AND is_approved = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complex is not available for reservations' USING ERRCODE = 'P0002';
  END IF;
  IF v_court.hourly_price IS NULL OR v_court.hourly_price <= 0 THEN
    RAISE EXCEPTION 'Court price is not configured' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.court_availability
     WHERE court_id = p_court_id
       AND day_of_week = EXTRACT(DOW FROM p_reservation_date)::integer
       AND is_available = true
       AND start_time <= p_start_time
       AND end_time >= p_end_time
  ) THEN
    RAISE EXCEPTION 'Requested time is outside court availability' USING ERRCODE = '22023';
  END IF;

  -- Serializes competing requests for one court/date, including non-identical overlaps.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_court_id::text || ':' || p_reservation_date::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.reservations
     WHERE court_id = p_court_id
       AND reservation_date = p_reservation_date
       AND payment_status <> 'cancelled'
       AND start_time < p_end_time
       AND end_time > p_start_time
  ) THEN
    RAISE EXCEPTION 'Requested time is no longer available' USING ERRCODE = '23P01';
  END IF;

  v_total_price := round(v_court.hourly_price * (EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0), 2);
  v_deposit_amount := CASE WHEN p_payment_method = 'cash' THEN round(v_total_price * 0.30, 2) ELSE 0 END;

  INSERT INTO public.reservations (
    user_id, complex_id, court_id, reservation_date, start_time, end_time,
    total_price, payment_method, payment_status, deposit_amount, deposit_paid, notes
  ) VALUES (
    v_user_id, v_complex.id, v_court.id, p_reservation_date, p_start_time, p_end_time,
    v_total_price, p_payment_method, 'pending', v_deposit_amount, false, NULLIF(trim(p_notes), '')
  ) RETURNING * INTO v_reservation;

  RETURN v_reservation;
END;
$$;

CREATE INDEX IF NOT EXISTS reservations_active_court_slot_idx
  ON public.reservations (court_id, reservation_date, start_time, end_time)
  WHERE payment_status <> 'cancelled';

CREATE OR REPLACE FUNCTION public.prevent_complex_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service-role administration and explicitly authorized admins retain full control.
  IF auth.role() = 'service_role' OR public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_approved, false)
       OR COALESCE(NEW.payment_status, 'pending') <> 'pending'
       OR NEW.subscription_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'Only an administrator can set approval or subscription fields' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
    RAISE EXCEPTION 'Only an administrator can change ownership, approval, or subscription fields' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_complex_privilege_changes ON public.sport_complexes;
CREATE TRIGGER prevent_complex_privilege_changes
  BEFORE INSERT OR UPDATE ON public.sport_complexes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_complex_privilege_changes();

CREATE OR REPLACE FUNCTION public.restrict_reservation_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_owner_of_complex(OLD.complex_id) THEN
    RAISE EXCEPTION 'Only the complex owner can update this reservation' USING ERRCODE = '42501';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.complex_id IS DISTINCT FROM OLD.complex_id
     OR NEW.court_id IS DISTINCT FROM OLD.court_id
     OR NEW.reservation_date IS DISTINCT FROM OLD.reservation_date
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time IS DISTINCT FROM OLD.end_time
     OR NEW.total_price IS DISTINCT FROM OLD.total_price
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
     OR NEW.deposit_paid IS DISTINCT FROM OLD.deposit_paid
     OR NEW.mercadopago_payment_id IS DISTINCT FROM OLD.mercadopago_payment_id
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.payment_status NOT IN ('pending', 'confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Owners may only set reservation status to pending, confirmed, or cancelled' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_reservation_mutations ON public.reservations;
CREATE TRIGGER restrict_reservation_mutations
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.restrict_reservation_mutations();

-- Direct writes let clients forge price, status, or ownership. Reservations now use the RPC.
DROP POLICY IF EXISTS "Users can create their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Complex owners can update reservations for their courts" ON public.reservations;
DROP POLICY IF EXISTS "Admins can manage reservations" ON public.reservations;
CREATE POLICY "Complex owners can update reservation status" ON public.reservations
  FOR UPDATE USING (public.is_owner_of_complex(complex_id)) WITH CHECK (public.is_owner_of_complex(complex_id));
CREATE POLICY "Admins can manage reservations" ON public.reservations
  FOR ALL USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

-- Ensure profile policies cannot be used to replace identities or roles. The trigger above
-- enforces those invariants because RLS WITH CHECK cannot compare OLD and NEW values.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, email, avatar_url) ON public.profiles TO authenticated;

-- Payment state is server-owned; a payment provider webhook may write through service_role.
DROP POLICY IF EXISTS "Users can create payment transactions for their reservations" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins can manage payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can manage payment transactions" ON public.payment_transactions
  FOR ALL USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_owner_of_complex(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_complex_privilege_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restrict_reservation_mutations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_to_owner(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_reservation(uuid, date, time, time, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_of_complex(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_owner(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, date, time, time, text, text) TO authenticated;
