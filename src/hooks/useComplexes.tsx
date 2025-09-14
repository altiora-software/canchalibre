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

export const useComplexes = () => {
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
      const { data, error } = await supabase
        .from('sport_complexes')
        .select(`
          *,
          sport_courts(*)
        `)
        .eq('is_approved', true)
        .eq('is_active', true);

      if (error) throw error;
      setComplexes((data ?? []).map(shape));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerComplexes = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sport_complexes')
        .select(`
          *,
          sport_courts(*),
          profiles!sport_complexes_owner_id_fkey (user_id)
        `)
        .eq('profiles.user_id', userId);

      if (error) throw error;
      setComplexes((data ?? []).map(shape));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplexes(); }, []);

  return { complexes, loading, error, refetch: fetchComplexes, fetchOwnerComplexes };
};
