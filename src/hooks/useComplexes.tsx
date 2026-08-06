// src/hooks/useComplexes.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CourtData {
  id: string;
  name: string;
  sport: string;
  players_capacity: number;
  surface_type?: string | null;
  has_lighting: boolean | null;
  has_roof: boolean | null;
  hourly_price?: number | null;
  is_active?: boolean | null;
}

export interface SportComplexData {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  neighborhood: string | null;
  phone: string | null;
  whatsapp: string | null;
  email?: string | null;
  website?: string | null;
  photos: string[];
  amenities: string[];
  catalog_sports: string[];
  opening_hours?: unknown;
  is_active: boolean;
  is_approved: boolean;
  payment_status: string;
  // 🔎 IMPORTANTES PARA EL MAPA
  latitude?: number | null;
  longitude?: number | null;

  // relaciones
  courts?: CourtData[];
}

const PAGE_SIZE = 50;

const shapePublicComplex = (row: any): SportComplexData => ({
  id: row.id,
  name: row.name,
  description: row.description ?? null,
  address: row.address,
  neighborhood: row.neighborhood ?? null,
  phone: row.phone ?? null,
  whatsapp: row.whatsapp ?? null,
  email: row.email ?? null,
  website: row.website ?? null,
  photos: row.photos ?? [],
  amenities: row.amenities ?? [],
  catalog_sports: row.catalog_sports ?? [],
  opening_hours: row.opening_hours,
  is_active: row.is_active,
  is_approved: row.is_approved,
  payment_status: row.payment_status ?? "unknown",
  latitude: typeof row.latitude === 'number' ? row.latitude : (row.latitude ? Number(row.latitude) : null),
  longitude: typeof row.longitude === 'number' ? row.longitude : (row.longitude ? Number(row.longitude) : null),
  courts: (row.sport_courts ?? []) as CourtData[],
});

export const useComplexes = (_userId: string | null = null, _isOwner = false, catalogSport?: string) => {
  const [complexes, setComplexes] = useState<SportComplexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const fetchComplexes = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }
      setError(null);
  
      // La tabla aplica RLS para complejos activos/aprobados. Pedimos una
      // lista explícita para no enviar teléfonos, WhatsApp ni email al catálogo.
      let query = supabase
        .from('sport_complexes')
        .select(`
          id,
          name,
          description,
          address,
          neighborhood,
          latitude,
          longitude,
          photos,
          amenities,
          catalog_sports,
          opening_hours,
          is_active,
          is_approved,
          payment_status,
          sport_courts: sport_courts (
            id,
            name,
            sport,
            players_capacity,
            surface_type,
            hourly_price,
            has_lighting,
            has_roof,
            is_active
          )
        `)
        .order('name', { ascending: true })
        .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);

      if (catalogSport && catalogSport !== 'todos') {
        query = query.contains('catalog_sports', [catalogSport === 'padel' ? 'padle' : catalogSport]);
      }

      const { data, error } = await query;
  
      if (error) throw error;
      // mapear/normalizar como tu shape original
      const next = (data ?? []).map(shapePublicComplex);
      setComplexes((current) => reset ? next : [...current, ...next.filter((item) => !current.some((existing) => existing.id === item.id))]);
      offsetRef.current += next.length;
      setHasMore(next.length === PAGE_SIZE);
    } catch (e: any) {
      setError(e.message ?? 'Error fetching complexes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [catalogSport]);
  

  const fetchOwnerComplexes = async (userId: string) => {
    if (!userId) {
      return [];
    }
  
    try {
      setLoading(true);
      setError(null);
  
      // NOTA: sport_complexes.owner_id referencia a profiles.id (según tu schema).
      // Aquí hacemos un join a profiles y filtramos por profiles.user_id = userId (auth.uid()).
      // La sintaxis "profiles!sport_complexes_owner_id_fkey (user_id)" es la forma
      // que Supabase genera para hacer el join usando la FK sport_complexes_owner_id_fkey.
      const { data, error } = await supabase
        .from("sport_complexes")
        .select(`
          *,
          sport_courts(*),
          profiles!sport_complexes_owner_id_fkey (id, user_id)
        `)
        .eq("profiles.user_id", userId) // filtramos por auth.users.id en profiles.user_id
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      const normalized = (data ?? []).map(shapePublicComplex);
      setComplexes(normalized);
  
      // también devolvemos los datos por si quien llama quiere usarlos
      return normalized;
    } catch (e: any) {
      setError(e?.message ?? "Error fetching owner complexes");
      setComplexes([]);
      return [];
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => { void fetchComplexes(true); }, [fetchComplexes]);

  const loadMore = useCallback(async () => {
    if (!loading && !loadingMore && hasMore) await fetchComplexes(false);
  }, [fetchComplexes, hasMore, loading, loadingMore]);

  return { complexes, loading, loadingMore, hasMore, error, refetch: () => fetchComplexes(true), loadMore, fetchOwnerComplexes };
};

/**
 * Loads one public complex independently from the catalog pagination. The select
 * deliberately mirrors the public catalog fields and excludes contact data.
 */
export const usePublicComplex = (complexId: string | undefined) => {
  const [complex, setComplex] = useState<SportComplexData | null>(null);
  const [loading, setLoading] = useState(Boolean(complexId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!complexId) {
      setComplex(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchComplex = async () => {
      const { data, error: queryError } = await supabase
        .from('sport_complexes')
        .select(`
        id,
        name,
        description,
        address,
        neighborhood,
        latitude,
        longitude,
        photos,
        amenities,
        catalog_sports,
        opening_hours,
        is_active,
        is_approved,
        payment_status,
        sport_courts: sport_courts (
          id,
          name,
          sport,
          players_capacity,
          surface_type,
          hourly_price,
          has_lighting,
          has_roof,
          is_active
        )
        `)
        .eq('id', complexId)
        .maybeSingle();
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setComplex(null);
      } else {
        setComplex(data ? shapePublicComplex(data) : null);
      }
    };

    void fetchComplex()
      .catch((queryError: Error) => {
        if (!cancelled) {
          setError(queryError.message);
          setComplex(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [complexId]);

  return { complex, loading, error };
};
