-- Availability is derived server-side. The browser never reads other customers'
-- reservations to determine whether a time can be booked.
CREATE OR REPLACE FUNCTION public.get_bookable_slots(
  p_court_id uuid,
  p_reservation_date date
)
RETURNS TABLE(start_time time, end_time time)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF p_reservation_date < current_date OR p_reservation_date > current_date + 90 THEN
    RAISE EXCEPTION 'Reservation date must be within the next 90 days' USING ERRCODE = '22023';
  END IF;

  -- Return only one-hour slots fully inside configured availability and without
  -- an active overlap. create_reservation remains authoritative at confirmation.
  RETURN QUERY
  SELECT DISTINCT
    generated.slot_start::time AS start_time,
    (generated.slot_start + interval '1 hour')::time AS end_time
  FROM public.sport_courts court
  JOIN public.sport_complexes complex ON complex.id = court.complex_id
  JOIN public.court_availability availability
    ON availability.court_id = court.id
   AND availability.day_of_week = EXTRACT(DOW FROM p_reservation_date)::integer
   AND availability.is_available = true
  CROSS JOIN LATERAL generate_series(
    (p_reservation_date + availability.start_time)::timestamp,
    (p_reservation_date + availability.end_time)::timestamp - interval '1 hour',
    interval '1 hour'
  ) AS generated(slot_start)
  WHERE court.id = p_court_id
    AND court.is_active = true
    AND complex.is_active = true
    AND complex.is_approved = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.reservations reservation
      WHERE reservation.court_id = court.id
        AND reservation.reservation_date = p_reservation_date
        AND reservation.payment_status <> 'cancelled'
        AND reservation.start_time < (generated.slot_start + interval '1 hour')::time
        AND reservation.end_time > generated.slot_start::time
    )
  ORDER BY start_time;
END;
$$;

REVOKE ALL ON FUNCTION public.get_bookable_slots(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bookable_slots(uuid, date) TO authenticated;
