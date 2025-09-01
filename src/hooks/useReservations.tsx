// src/hooks/useReservations.ts
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEBUG = true;

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

  // joins (opcional)
  sport_complexes?: { name: string; address: string; phone?: string | null; whatsapp?: string | null };
  sport_courts?: { name: string; sport: string };
}

export interface TimeSlot {
  id: string;
  court_id: string;
  day_of_week: number;  // 0..6 o 1..7
  start_time: string;   // HH:mm o HH:mm:ss
  end_time: string;     // HH:mm o HH:mm:ss
  is_available: boolean | null;
}

export interface FreeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

/* ----------------------- helpers de tiempo ----------------------- */
const pad = (n: number) => n.toString().padStart(2, "0");
const normTime = (t: string) => (t ?? "").slice(0, 5); // "09:00:00" -> "09:00"
const timeToMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
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
        if (DEBUG) console.warn("[reservations] no user id; devolvemos lista vacía");
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

      if (DEBUG) {
        console.groupCollapsed("[reservations] fetchUserReservations");
        console.log("user_id:", uid);
        console.table(data || []);
        console.groupEnd();
      }

      setReservations((data ?? []) as unknown as ReservationData[]);
    } catch (err: any) {
      setError(err.message ?? "Error al obtener reservas");
      setReservations([]);
      if (DEBUG) console.error("[reservations] fetchUserReservations error:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Devuelve slots libres (p.ej. de 1h) para una cancha y fecha.
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
    if (DEBUG) {
      console.groupCollapsed("[reservations] fetchAvailableSlots");
      console.log("INPUT → courtId:", courtId, "dateStr:", dateStr, "stepMin:", stepMin);
      console.log("dow (0-6):", dow, "isoDow (1-7):", isoDow);
    }

    // 1) Disponibilidad del día (no filtramos por is_available para no perder NULL)
    const { data: availability, error: e1 } = await supabase
      .from("court_availability")
      .select("day_of_week,start_time,end_time,is_available")
      .eq("court_id", courtId)
      .in("day_of_week", [dow, isoDow]);

    if (DEBUG) {
      if (e1) console.error("availability error:", e1);
      console.table(availability || [], ["day_of_week", "start_time", "end_time", "is_available"]);
    }
    if (e1) {
      if (DEBUG) console.groupEnd();
      return [];
    }

    let openRanges =
      (availability ?? [])
        .filter((r) => r.is_available !== false)
        .map((r) => ({
          start_time: normTime(r.start_time),
          end_time: normTime(r.end_time),
        }));

    if (DEBUG) {
      console.log("openRanges (filtrado is_available!==false):", openRanges);
    }

    // Fallback si no hay filas
    if (!openRanges.length) {
      openRanges = [{ start_time: "09:00", end_time: "23:00" }];
      if (DEBUG) console.warn("No hay availability para ese día → usamos fallback 09:00-23:00");
    }

    const base = buildBaseSlots(openRanges, stepMin);
    if (DEBUG) {
      console.log("base slots generados (antes de restar reservas):", base.length);
      if (base.length <= 30) console.table(base);
    }

    // 2) Reservas ocupadas del día
    const { data: reservations, error: e2 } = await supabase
      .from("reservations")
      .select("start_time,end_time")
      .eq("court_id", courtId)
      .eq("reservation_date", dateStr)
      .in("payment_status", ["pending", "confirmed", "paid"]);

    if (DEBUG) {
      if (e2) console.error("reservations error:", e2);
      console.table(reservations || [], ["start_time", "end_time"]);
    }

    if (e2) {
      if (DEBUG) console.groupEnd();
      return base; // mostrar base aunque no podamos traer ocupadas
    }

    const busy = (reservations ?? []).map((r) => ({
      start: normTime(r.start_time),
      end: normTime(r.end_time),
    }));

    if (DEBUG) {
      console.log("busy (reservas en el día):", busy);
    }

    // 3) Slots libres = base – ocupados
    const free = base.filter((s) => !busy.some((b) => overlaps(s, b)));

    if (DEBUG) {
      console.log("free slots:", free.length);
      if (free.length <= 40) console.table(free);
      console.groupEnd();
    }

    return free;
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
      if (DEBUG) {
        console.groupCollapsed("[reservations] checkSlotAvailability");
        console.log("INPUT →", { courtId, date, startTime, endTime });
      }
      const free = await fetchAvailableSlots(courtId, date);
      let ok = true;
      for (let t = timeToMin(startTime); t < timeToMin(endTime); t += 60) {
        const s = { start: minToTime(t), end: minToTime(t + 60) };
        const has = free.some((f) => f.start === s.start && f.end === s.end);
        if (DEBUG) console.log("bloque", s, "libre?", has);
        if (!has) ok = false;
      }
      if (DEBUG) {
        console.log("RESULT → disponible?:", ok);
        console.groupEnd();
      }
      return ok;
    } catch (err) {
      if (DEBUG) console.error("[reservations] checkSlotAvailability error:", err);
      return false;
    }
  };

  const createReservation = async (
    reservationData: Omit<ReservationData, "id" | "created_at" | "updated_at">
  ) => {
    try {
      if (DEBUG) {
        console.groupCollapsed("[reservations] createReservation");
        console.log("payload:", reservationData);
      }
      const { data, error } = await supabase
        .from("reservations")
        .insert([reservationData])
        .select()
        .single();
      if (error) throw error;
      if (DEBUG) {
        console.log("inserted:", data);
        console.groupEnd();
      }
      return { data, error: null as any };
    } catch (err: any) {
      if (DEBUG) {
        console.error("[reservations] createReservation error:", err);
        console.groupEnd?.();
      }
      return { data: null, error: err.message ?? "No se pudo crear la reserva" };
    }
  };

  const updateReservationStatus = async (
    reservationId: string,
    status: string,
    paymentId?: string
  ) => {
    try {
      if (DEBUG) {
        console.groupCollapsed("[reservations] updateReservationStatus");
        console.log("reservationId:", reservationId, "status:", status, "paymentId:", paymentId);
      }
      const updateData: any = { payment_status: status };
      if (paymentId) updateData.mercadopago_payment_id = paymentId;

      const { data, error } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", reservationId)
        .select()
        .single();
      if (error) throw error;

      if (DEBUG) {
        console.log("updated:", data);
        console.groupEnd();
      }
      return { data, error: null as any };
    } catch (err: any) {
      if (DEBUG) {
        console.error("[reservations] updateReservationStatus error:", err);
        console.groupEnd?.();
      }
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
    fetchAvailableSlots,
    checkSlotAvailability,
    createReservation,
    updateReservationStatus,
    refetch: fetchUserReservations,
  };
};
