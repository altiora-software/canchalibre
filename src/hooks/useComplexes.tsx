import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SportComplexData {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  phone: string;
  whatsapp: string;
  email?: string;
  website?: string;
  photos: string[];
  amenities: string[];
  opening_hours?: any;
  is_active: boolean;
  is_approved: boolean;
  latitude?: number;
  longitude?: number;
  courts?: CourtData[];
}

export interface CourtData {
  id: string;
  name: string;
  sport: string;
  players_capacity: number;
  surface_type?: string;
  has_lighting: boolean;
  has_roof: boolean;
  hourly_price?: number;
}

export const useComplexes = () => {
  const [complexes, setComplexes] = useState<SportComplexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplexes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sport_complexes')
        .select(`
          *,
          sport_courts (*)
        `)
        .eq('is_approved', true)
        .eq('is_active', true);

      if (error) throw error;

      const formattedComplexes: SportComplexData[] = data?.map((complex: any) => ({
        id: complex.id,
        name: complex.name,
        address: complex.address,
        neighborhood: complex.neighborhood,
        phone: complex.phone,
        whatsapp: complex.whatsapp,
        email: complex.email,
        website: complex.website,
        photos: complex.photos || [],
        amenities: complex.amenities || [],
        opening_hours: complex.opening_hours,
        is_active: complex.is_active,
        is_approved: complex.is_approved,
        latitude: complex.latitude,
        longitude: complex.longitude,
        courts: complex.sport_courts || [],
      })) || [];

      setComplexes(formattedComplexes);
      console.log('formattedComplexes', formattedComplexes);
    } catch (err: any) {
      setError(err.message);
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
          sport_courts (*),
          profiles!sport_complexes_owner_id_fkey (user_id)
        `)
        .eq('profiles.user_id', userId);

      if (error) throw error;

      const formattedComplexes: SportComplexData[] = data?.map((complex: any) => ({
        id: complex.id,
        name: complex.name,
        address: complex.address,
        neighborhood: complex.neighborhood,
        phone: complex.phone,
        whatsapp: complex.whatsapp,
        email: complex.email,
        website: complex.website,
        photos: complex.photos || [],
        amenities: complex.amenities || [],
        opening_hours: complex.opening_hours,
        is_active: complex.is_active,
        is_approved: complex.is_approved,
        latitude: complex.latitude,
        longitude: complex.longitude,
        courts: complex.sport_courts || [],
      })) || [];

      setComplexes(formattedComplexes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplexes();
  }, []);

  return { complexes, loading, error, refetch: fetchComplexes, fetchOwnerComplexes };
};