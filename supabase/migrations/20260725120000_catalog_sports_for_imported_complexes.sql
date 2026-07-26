-- Catalog sports are discovery metadata. They do not assert that a bookable
-- court, price, capacity, roof, or lighting has been verified.

ALTER TABLE public.sport_complexes
  ADD COLUMN IF NOT EXISTS catalog_sports public.sport_type[] NOT NULL DEFAULT '{}'::public.sport_type[];

CREATE INDEX IF NOT EXISTS sport_complexes_catalog_sports_idx
  ON public.sport_complexes USING gin (catalog_sports);

CREATE OR REPLACE FUNCTION public.sync_complex_catalog_sports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_complex_id uuid := COALESCE(NEW.complex_id, OLD.complex_id);
BEGIN
  UPDATE public.sport_complexes
     SET catalog_sports = COALESCE((
       SELECT array_agg(DISTINCT court.sport ORDER BY court.sport)
       FROM public.sport_courts AS court
       WHERE court.complex_id = v_complex_id
     ), '{}'::public.sport_type[])
   WHERE id = v_complex_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_complex_catalog_sports_on_court_change ON public.sport_courts;
CREATE TRIGGER sync_complex_catalog_sports_on_court_change
AFTER INSERT OR UPDATE OF sport, complex_id OR DELETE ON public.sport_courts
FOR EACH ROW EXECUTE FUNCTION public.sync_complex_catalog_sports();

UPDATE public.sport_complexes AS complex
   SET catalog_sports = COALESCE((
     SELECT array_agg(DISTINCT court.sport ORDER BY court.sport)
     FROM public.sport_courts AS court
     WHERE court.complex_id = complex.id
   ), '{}'::public.sport_type[])
 WHERE EXISTS (
   SELECT 1 FROM public.sport_courts AS court WHERE court.complex_id = complex.id
 );
