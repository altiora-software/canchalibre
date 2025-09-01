import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SportComplexData = {
  id: string;
  name: string;
  address: string;
  neighborhood?: string | null;
  is_active: boolean;
  owner_id?: string;
  courts?: Array<{
    id: string;
    name: string;
    sport: string;
    hourly_price: number | null;
    is_active: boolean;
  }>;
};

type Options = {
  /** Cache key para hidratar desde localStorage y no bloquear el render */
  cacheKey?: string;
  /** Si se pasa, trae *solo* complejos de ese dueño (para dashboard) */
  ownerId?: string;
  /** Por defecto true: intenta leer de cache antes de hacer fetch */
  hydrateFromCache?: boolean;
};

const DEFAULT_CACHE_KEY = "complexes_cache_v1";

/**
 * Hook SWR-like: pinta con cache si existe y revalida en segundo plano.
 * No bloquea la UI inicial. Ofrece `fetching`, `error` y `refetch`.
 */
export function useComplexes(options: Options = {}) {
  const {
    cacheKey = DEFAULT_CACHE_KEY,
    ownerId,
    hydrateFromCache = true,
  } = options;

  const [complexes, setComplexes] = useState<SportComplexData[]>(() => {
    if (!hydrateFromCache) return [];
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SportComplexData[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string>("");

  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async () => {
    setError("");
    setFetching(true);

    // Cancelación si el componente se desmonta
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // ⚠️ IMPORTANTE: relajamos el tipado SOLO acá para evitar
      // "Type instantiation is excessively deep..."
      const sb = supabase as any;

      let query = sb
        .from("sport_complexes")
        .select(`
          id,
          name,
          address,
          neighborhood,
          is_active,
          owner_id,
          sport_courts (
            id,
            name,
            sport,
            hourly_price,
            is_active
          )
        `)
        .eq("is_published", true)
        .order("name", { ascending: true });
      
      if (ownerId) {
        query = query.eq("owner_id", ownerId);
      }
      
      // casteamos la respuesta a any[], y recién después la mapeamos
      const { data, error } = await query as { data: any[] | null; error: any };
      if (ac.signal.aborted) return;
      if (error) throw error;

      const mapped: SportComplexData[] =
        (data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          address: row.address,
          neighborhood: row.neighborhood ?? null,
          is_active: !!row.is_active,
          owner_id: row.owner_id ?? undefined,
          courts: (row.sport_courts ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            sport: c.sport ?? "",
            hourly_price: c.hourly_price,
            is_active: !!c.is_active,
          })),
        })) ?? [];

      setComplexes(mapped);
      localStorage.setItem(cacheKey, JSON.stringify(mapped));
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message ?? "No se pudieron cargar los complejos.");
    } finally {
      if (!ac.signal.aborted) setFetching(false);
    }
  }, [cacheKey, ownerId]);

  useEffect(() => {
    fetchAll();
    return () => abortRef.current?.abort();
  }, [fetchAll]);

  return {
    complexes,
    fetching,
    error,
    refetch: fetchAll,
  };
}
