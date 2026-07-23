-- Owner-assisted bookings keep the customer web flow separate from walk-in/phone
-- bookings. Prices and ownership are calculated in the database in both flows.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS booking_source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_phone text;

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_booking_source_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_booking_source_check
  CHECK (booking_source IN ('web', 'owner_manual'));

CREATE TABLE IF NOT EXISTS public.owner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('new_web_reservation', 'owner_manual_reservation')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_profile_id, reservation_id, kind)
);

ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can read their notifications" ON public.owner_notifications;
CREATE POLICY "Owners can read their notifications" ON public.owner_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = owner_notifications.owner_profile_id
        AND profiles.user_id = auth.uid()
        AND profiles.role = 'owner'
    )
  );

CREATE OR REPLACE FUNCTION public.create_owner_reservation(
  p_court_id uuid,
  p_reservation_date date,
  p_start_time time,
  p_end_time time,
  p_payment_method text,
  p_guest_name text,
  p_guest_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_court public.sport_courts%ROWTYPE;
  v_complex public.sport_complexes%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
  v_total_price numeric(12,2);
  v_deposit_amount numeric(12,2);
BEGIN
  IF auth.uid() IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF p_reservation_date < current_date - 365 OR p_reservation_date > current_date + 365 THEN
    RAISE EXCEPTION 'Reservation date is outside the allowed range' USING ERRCODE = '22023';
  END IF;
  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'End time must be after start time' USING ERRCODE = '22023';
  END IF;
  IF p_payment_method NOT IN ('mercado_pago', 'transfer', 'cash') THEN
    RAISE EXCEPTION 'Unsupported payment method' USING ERRCODE = '22023';
  END IF;
  IF char_length(trim(COALESCE(p_guest_name, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Guest name must contain between 2 and 120 characters' USING ERRCODE = '22023';
  END IF;
  IF p_guest_phone IS NOT NULL AND p_guest_phone !~ '^[0-9+() -]{6,32}$' THEN
    RAISE EXCEPTION 'Guest phone has an invalid format' USING ERRCODE = '22023';
  END IF;
  IF p_notes IS NOT NULL AND char_length(p_notes) > 1000 THEN
    RAISE EXCEPTION 'Notes are too long' USING ERRCODE = '22001';
  END IF;

  SELECT * INTO v_court FROM public.sport_courts WHERE id = p_court_id AND is_active = true;
  IF NOT FOUND OR NOT public.is_owner_of_complex(v_court.complex_id) THEN
    RAISE EXCEPTION 'Court is not available for this owner' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_complex FROM public.sport_complexes WHERE id = v_court.complex_id;
  IF v_court.hourly_price IS NULL OR v_court.hourly_price <= 0 THEN
    RAISE EXCEPTION 'Court price is not configured' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_court_id::text || ':' || p_reservation_date::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.reservations
    WHERE court_id = p_court_id AND reservation_date = p_reservation_date
      AND payment_status <> 'cancelled'
      AND start_time < p_end_time AND end_time > p_start_time
  ) THEN
    RAISE EXCEPTION 'Requested time is no longer available' USING ERRCODE = '23P01';
  END IF;

  v_total_price := round(v_court.hourly_price * (EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0), 2);
  v_deposit_amount := CASE WHEN p_payment_method = 'cash' THEN round(v_total_price * 0.30, 2) ELSE 0 END;
  INSERT INTO public.reservations (
    user_id, complex_id, court_id, reservation_date, start_time, end_time,
    total_price, payment_method, payment_status, deposit_amount, deposit_paid,
    notes, booking_source, guest_name, guest_phone
  ) VALUES (
    NULL, v_complex.id, v_court.id, p_reservation_date, p_start_time, p_end_time,
    v_total_price, p_payment_method, 'pending', v_deposit_amount, false,
    NULLIF(trim(p_notes), ''), 'owner_manual', trim(p_guest_name), NULLIF(trim(p_guest_phone), '')
  ) RETURNING * INTO v_reservation;
  RETURN v_reservation;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_owner_about_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_profile_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_profile_id FROM public.sport_complexes WHERE id = NEW.complex_id;
  IF v_owner_profile_id IS NOT NULL THEN
    INSERT INTO public.owner_notifications (owner_profile_id, reservation_id, kind)
    VALUES (v_owner_profile_id, NEW.id, CASE WHEN NEW.booking_source = 'web' THEN 'new_web_reservation' ELSE 'owner_manual_reservation' END)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS owner_notification_on_reservation ON public.reservations;
CREATE TRIGGER owner_notification_on_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_owner_about_reservation();

CREATE OR REPLACE FUNCTION public.get_owner_notifications()
RETURNS TABLE (
  id uuid, reservation_id uuid, kind text, read_at timestamptz, created_at timestamptz,
  reservation_date date, start_time time, end_time time, court_name text, guest_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT n.id, n.reservation_id, n.kind, n.read_at, n.created_at,
         r.reservation_date, r.start_time, r.end_time, c.name, COALESCE(r.guest_name, p.full_name)
  FROM public.owner_notifications n
  JOIN public.profiles owner ON owner.id = n.owner_profile_id
  JOIN public.reservations r ON r.id = n.reservation_id
  JOIN public.sport_courts c ON c.id = r.court_id
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE owner.user_id = auth.uid() AND owner.role = 'owner'
  ORDER BY n.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.mark_owner_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.owner_notifications n
     SET read_at = COALESCE(read_at, now())
   WHERE n.id = p_notification_id
     AND EXISTS (
       SELECT 1 FROM public.profiles owner
       WHERE owner.id = n.owner_profile_id AND owner.user_id = auth.uid() AND owner.role = 'owner'
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_owner_reservation(uuid, date, time, time, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_notifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_owner_notification_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_owner_reservation(uuid, date, time, time, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_owner_notification_read(uuid) TO authenticated;
