-- Run after 20260725120000_catalog_sports_for_imported_complexes.sql.
-- Tags the existing Google imports without creating fictional sport_courts.

BEGIN;

UPDATE public.sport_complexes
   SET catalog_sports = ARRAY['futbol']::public.sport_type[]
 WHERE owner_id IS NULL
   AND description LIKE 'Imported from Google Maps. Source category:%'
   AND catalog_sports IS DISTINCT FROM ARRAY['futbol']::public.sport_type[];

UPDATE public.sport_complexes
   SET catalog_sports = ARRAY['basquet']::public.sport_type[]
 WHERE owner_id IS NULL
   AND description LIKE 'Imported from Google Maps basketball search.%'
   AND catalog_sports IS DISTINCT FROM ARRAY['basquet']::public.sport_type[];

COMMIT;
