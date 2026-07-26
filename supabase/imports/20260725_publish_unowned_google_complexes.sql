-- Publishes only catalog entries created by the Google Maps import scripts.
-- Safe to rerun. It does not change ownership, prices, courts, or RLS.

BEGIN;

-- The SQL editor executes without a JWT. Scope the trusted server role to this
-- transaction so the database trigger recognizes this as an administrative action.
SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.sport_complexes
   SET is_active = true,
       is_approved = true
 WHERE owner_id IS NULL
   AND (
     description LIKE 'Imported from Google Maps.%'
     OR description LIKE 'Imported from Google Maps basketball search.%'
   )
   AND (is_active IS DISTINCT FROM true OR is_approved IS DISTINCT FROM true);

COMMIT;
