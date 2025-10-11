// src/hooks/useComplexes.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CourtData {
  id: string;
  name: string;
  sport: string;
  players_capacity: number;
  surface_type?: string | null;
  has_lighting: boolean;
  has_roof: boolean;
  hourly_price?: number | null;
}

export interface SportComplexData {
  id: string;
  name: string;
  address: string;
  neighborhood: string | null;
  phone: string | null;
  whatsapp: string | null;
  email?: string | null;
  website?: string | null;
  photos: string[];
  amenities: string[];
  opening_hours?: any;
  is_active: boolean;
  is_approved: boolean;
  payment_status: string;
  // 🔎 IMPORTANTES PARA EL MAPA
  latitude?: number | null;
  longitude?: number | null;

  // relaciones
  courts?: CourtData[];
}

export const useComplexes = (userId: string | null, isOwner: boolean) => {
  const [complexes, setComplexes] = useState<SportComplexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shape = (row: any): SportComplexData => ({
    id: row.id,
    name: row.name,
    address: row.address,
    neighborhood: row.neighborhood ?? null,
    phone: row.phone ?? null,
    whatsapp: row.whatsapp ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    photos: row.photos ?? [],
    amenities: row.amenities ?? [],
    opening_hours: row.opening_hours,
    is_active: row.is_active,
    is_approved: row.is_approved,
    payment_status: row.is_approved,

    // asegura number | null
    latitude: typeof row.latitude === 'number' ? row.latitude : (row.latitude ? Number(row.latitude) : null),
    longitude: typeof row.longitude === 'number' ? row.longitude : (row.longitude ? Number(row.longitude) : null),

    courts: (row.sport_courts ?? []) as CourtData[],
  });

  const fetchComplexes = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Usamos la vista pública con solo campos no-sensibles
      const { data, error } = await supabase
        .from('sport_complexes_public')   // <-- vista en DB
        .select(`
          *,
          sport_courts: sport_courts (
            id,
            name,
            sport,
            players_capacity,
            surface_type,
            hourly_price,
            is_active
          )
        `);
  
      if (error) throw error;
      // mapear/normalizar como tu shape original
      setComplexes((data ?? []).map(shape));
    } catch (e: any) {
      setError(e.message ?? 'Error fetching complexes');
    } finally {
      setLoading(false);
    }
  };
  

  const fetchOwnerComplexes = async (userId: string) => {
    if (!userId) {
      console.warn("fetchOwnerComplexes: userId vacío, abortando.");
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
  
      const normalized = (data ?? []).map(shape);
      setComplexes(normalized);
  
      // también devolvemos los datos por si quien llama quiere usarlos
      return normalized;
    } catch (e: any) {
      console.error("fetchOwnerComplexes error:", e);
      setError(e?.message ?? "Error fetching owner complexes");
      setComplexes([]);
      return [];
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => { fetchComplexes(); }, []);

  return { complexes, loading, error, refetch: fetchComplexes, fetchOwnerComplexes };
};
