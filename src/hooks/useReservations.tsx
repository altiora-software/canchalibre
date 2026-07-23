import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReservationData {
  id: string;
  user_id: string;
  complex_id: string;
  court_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  payment_method: 'mercado_pago' | 'transfer' | 'cash';
  payment_status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  deposit_amount: number;
  deposit_paid: boolean;
  mercadopago_payment_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BookableSlot {
  start_time: string;
  end_time: string;
}

type CreateReservationInput = Pick<
  ReservationData,
  'court_id' | 'reservation_date' | 'start_time' | 'end_time' | 'payment_method' | 'notes'
>;

export const useReservations = () => {
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('reservations')
        .select('*')
        .order('reservation_date', { ascending: true });

      if (queryError) throw queryError;
      setReservations((data ?? []) as ReservationData[]);
    } catch (err: any) {
      setError(err.message ?? 'No se pudieron cargar las reservas.');
    } finally {
      setLoading(false);
    }
  };

  // This RPC is intentionally the only client-side availability read. It exposes
  // bookable slots, not another customer's reservations or their personal data.
  const fetchBookableSlots = useCallback(async (courtId: string, date: string): Promise<BookableSlot[]> => {
    const { data, error: rpcError } = await supabase.rpc('get_bookable_slots' as never, {
      p_court_id: courtId,
      p_reservation_date: date,
    } as never);

    if (rpcError) throw new Error(rpcError.message);
    return (data as unknown as BookableSlot[] | null) ?? [];
  }, []);

  const createReservation = async (reservationData: CreateReservationInput) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('create_reservation' as never, {
        p_court_id: reservationData.court_id,
        p_reservation_date: reservationData.reservation_date,
        p_start_time: reservationData.start_time,
        p_end_time: reservationData.end_time,
        p_payment_method: reservationData.payment_method,
        p_notes: reservationData.notes ?? null,
      } as never);

      if (rpcError) throw rpcError;
      const reservation = data as unknown as ReservationData | null;
      if (!reservation) throw new Error('La reserva no devolvió un resultado.');
      return { data: reservation, error: null as string | null };
    } catch (err: any) {
      return { data: null, error: err.message ?? 'No se pudo crear la reserva.' };
    }
  };

  const updateReservationStatus = async (reservationId: string, status: string, paymentId?: string) => {
    try {
      const updateData: { payment_status: string; mercadopago_payment_id?: string } = { payment_status: status };
      if (paymentId) updateData.mercadopago_payment_id = paymentId;

      const { data, error: updateError } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', reservationId)
        .select()
        .single();

      if (updateError) throw updateError;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message ?? 'No se pudo actualizar la reserva.' };
    }
  };

  useEffect(() => {
    void fetchUserReservations();
  }, []);

  return {
    reservations,
    loading,
    error,
    fetchUserReservations,
    fetchBookableSlots,
    createReservation,
    updateReservationStatus,
    refetch: fetchUserReservations,
  };
};
