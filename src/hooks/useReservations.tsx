// src/hooks/useReservations.ts
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReservationData {
  id: string;
  user_id: string;
  complex_id: string;
  court_id: string;
  reservation_date: string; // YYYY-MM-DD
  start_time: string;       // HH:mm
  end_time: string;         // HH:mm
  total_price: number;
  payment_method: "mercado_pago" | "transfer" | "cash";
  payment_status: "pending" | "confirmed" | "paid" | "cancelled";
  deposit_amount: number;
  deposit_paid: boolean;
  mercadopago_payment_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  // ⬇️ joins opcionales (los dejamos en el objeto)
  sport_complexes?: { name: string; address: string; phone?: string | null; whatsapp?: string | null };
  sport_courts?: { name: string; sport: string };
}

// Fila de disponibilidad (DB)
export interface TimeSlot {
  id: string;
  court_id: string;
  day_of_week: number;  // 0..6 o 1..7 dependiendo de cómo lo guardaste
  start_time: string;   // HH:mm o HH:mm:ss
  end_time: string;     // HH:mm o HH:mm:ss
  is_available: boolean | null;
}

// Slot libre concreto (derivado de availability – reservations)
export interface FreeSlot {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

/* ----------------------- helpers de tiempo ----------------------- */
const pad = (n: number) => n.toString().padStart(2, "0");
const normTime = (t: string) => t.slice(0, 5); // "09:00:00" -> "09:00"
const timeToMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const minToTime = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const buildBaseSlots = (ranges: { start_time: string; end_time: string }[], stepMin = 60): FreeSlot[] => {
  const out: FreeSlot[] = [];
  for (const r of ranges) {
    let t = timeToMin(normTime(r.start_time));
    const end = timeToMin(normTime(r.end_time));
    while (t + stepMin <= end) {
      out.push({ start: minToTime(t), end: minToTime(t + stepMin) });
      t += stepMin;
    }
  }
  return out;
};
const overlaps = (a: FreeSlot, b: FreeSlot) =>
  timeToMin(a.start) < timeToMin(b.end) && timeToMin(b.start) < timeToMin(a.end);

/* ------------------------ hook principal ------------------------ */
export const useReservations = () => {
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) {
        setReservations([]);
        return;
      }

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          sport_complexes (name, address, phone, whatsapp),
          sport_courts (name, sport)
        `)
        .eq("user_id", uid)
        .order("reservation_date", { ascending: true });

      if (error) throw error;

      // Dejamos los joins dentro del objeto
      setReservations((data ?? []) as unknown as ReservationData[]);
    } catch (err: any) {
      setError(err.message ?? "Error al obtener reservas");
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Devuelve slots libres (p.ej. de 1h) para una cancha y fecha.
   * `dateStr` debe ser "YYYY-MM-DD" (fecha local).
   * Tolera day_of_week 0–6 o 1–7 y is_available null.
   */
  const fetchAvailableSlots = async (
    courtId: string,
    dateStr: string,
    stepMin = 60
  ): Promise<FreeSlot[]> => {
    const d = new Date(`${dateStr}T00:00:00`);
    const dow = d.getDay();                 // 0..6 (Domingo=0)
    const isoDow = ((dow + 6) % 7) + 1;     // 1..7 (Lunes=1..Domingo=7)

    // 1) Disponibilidad del día: NO filtramos por is_available en SQL para no perder NULL
    const { data: availability, error: e1 } = await supabase
      .from("court_availability")
      .select("day_of_week,start_time,end_time,is_available")
      .eq("court_id", courtId)
      .in("day_of_week", [dow, isoDow]);

    if (e1) {
      console.error("availability error", e1);
      return [];
    }

    // Consideramos disponible si no es false (true o null = abre)
    let openRanges =
      (availability ?? [])
        .filter((r) => r.is_available !== false)
        .map((r) => ({
          start_time: normTime(r.start_time),
          end_time: normTime(r.end_time),
        }));

    // Fallback si no hay filas (abre de 09:00 a 23:00)
    if (!openRanges.length) {
      openRanges = [{ start_time: "09:00", end_time: "23:00" }];
    }

    // 2) Reservas ocupadas del día (no contamos canceladas)
    const { data: reservations, error: e2 } = await supabase
      .from("reservations")
      .select("start_time,end_time")
      .eq("court_id", courtId)
      .eq("reservation_date", dateStr)
      .in("payment_status", ["pending", "confirmed", "paid"]);

    if (e2) {
      console.error("reservations error", e2);
      return buildBaseSlots(openRanges, stepMin); // mostramos base aunque no podamos traer ocupadas
    }

    const busy = (reservations ?? []).map((r) => ({
      start: normTime(r.start_time),
      end: normTime(r.end_time),
    }));

    // 3) Slots libres = base – ocupados
    const base = buildBaseSlots(openRanges, stepMin);
    return base.filter((s) => !busy.some((b) => overlaps(s, b)));
  };

  /**
   * Verifica si TODO el rango [startTime, endTime) está libre.
   */
  const checkSlotAvailability = async (
    courtId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> => {
    try {
      const free = await fetchAvailableSlots(courtId, date);
      for (let t = timeToMin(startTime); t < timeToMin(endTime); t += 60) {
        const s = { start: minToTime(t), end: minToTime(t + 60) };
        if (!free.some((f) => f.start === s.start && f.end === s.end)) return false;
      }
      return true;
    } catch (err) {
      console.error("Error checking availability:", err);
      return false;
    }
  };

  const createReservation = async (
    reservationData: Omit<ReservationData, "id" | "created_at" | "updated_at">
  ) => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .insert([reservationData])
        .select()
        .single();
      if (error) throw error;
      return { data, error: null as any };
    } catch (err: any) {
      return { data: null, error: err.message ?? "No se pudo crear la reserva" };
    }
  };

  const updateReservationStatus = async (
    reservationId: string,
    status: string,
    paymentId?: string
  ) => {
    try {
      const updateData: any = { payment_status: status };
      if (paymentId) updateData.mercadopago_payment_id = paymentId;

      const { data, error } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", reservationId)
        .select()
        .single();
      if (error) throw error;

      return { data, error: null as any };
    } catch (err: any) {
      return { data: null, error: err.message ?? "No se pudo actualizar el estado" };
    }
  };

  useEffect(() => {
    fetchUserReservations();
  }, []);

  return {
    reservations,
    loading,
    error,
    fetchUserReservations,
    fetchAvailableSlots,   // FreeSlot[]  [{start,end}, ...]
    checkSlotAvailability, // usa los slots libres reales
    createReservation,
    updateReservationStatus,
    refetch: fetchUserReservations,
  };
};
