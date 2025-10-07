// components/CreateReservationModal.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast as uiToast } from "@/hooks/use-toast"; // AJUSTA la ruta a tu toaster si difiere

type PaymentMethod = "cash" | "mercado_pago" | string;

export interface OwnerReservation {
  reservation_id: string;
  user_id: string;
  complex_id: string;
  court_id: string;
  reservation_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  total_price?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  payment_method?: PaymentMethod;
  payment_status?: "pending" | "approved" | "cancelled" | "paid";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // nested for UI
  sport_complexes?: { id?: string; name?: string; owner_id?: string };
  sport_courts?: { id?: string; name?: string; sport?: string };
  profiles?: { full_name?: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  authUserId: string; // supabase auth user id (2ff9...)
  onCreated?: (reservation: OwnerReservation) => void;
}

export default function CreateReservationModal({ isOpen, onClose, authUserId, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);

  const [complexes, setComplexes] = useState<Array<{ id: string; name: string }>>([]);
  const [courts, setCourts] = useState<Array<{ id: string; name: string; sport: string }>>([]);

  // form
  const [complexId, setComplexId] = useState<string>("");
  const [courtId, setCourtId] = useState<string>("");
  const [date, setDate] = useState<string>(""); // YYYY-MM-DD
  const [startTime, setStartTime] = useState<string>("15:00"); // HH:mm
  const [endTime, setEndTime] = useState<string>("16:00"); // HH:mm
  const [totalPrice, setTotalPrice] = useState<string>("45000");
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [depositPaid, setDepositPaid] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState<string>("");

  // load owner profile id and complexes once
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        // profile.id correspondiente al owner (profiles.id)
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("user_id", authUserId)
          .single();

        if (profileErr) {
          console.warn("No se pudo obtener profile:", profileErr);
        } else {
          setOwnerProfileId(profileData.id);
          // cargar complejos del owner
          const { data: comps, error: compsErr } = await supabase
            .from("sport_complexes")
            .select("id, name")
            .eq("owner_id", profileData.id)
            .order("name", { ascending: true });

          if (compsErr) {
            console.warn("No se pudieron cargar complejos:", compsErr);
            setComplexes([]);
          } else {
            setComplexes(comps ?? []);
            if ((comps ?? []).length > 0) setComplexId(comps![0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [isOpen, authUserId]);

  // load courts when complex changes
  useEffect(() => {
    (async () => {
      if (!complexId) {
        setCourts([]);
        setCourtId("");
        return;
      }
      const { data: cs, error } = await supabase
        .from("sport_courts")
        .select("id, name, sport")
        .eq("complex_id", complexId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error cargando canchas:", error);
        setCourts([]);
        return;
      }
      setCourts(cs ?? []);
      if ((cs ?? []).length > 0) setCourtId(cs![0].id);
    })();
  }, [complexId]);

  // helper
  const toTimeWithSeconds = (hhmm: string) => (hhmm.length === 5 ? `${hhmm}:00` : hhmm || "00:00:00");

  // check overlaps (no timezone math; compare HH:mm:ss strings)
  const checkOverlap = async (court_id: string, reservation_date: string, start: string, end: string) => {
    const { data: conflicts, error } = await supabase
      .from("reservations")
      .select("id, start_time, end_time")
      .eq("court_id", court_id)
      .eq("reservation_date", reservation_date)
      .filter("start_time", "lt", end)
      .filter("end_time", "gt", start);

    if (error) throw error;
    return (conflicts ?? []).length > 0;
  };

  const resetForm = () => {
    setComplexId(complexes?.[0]?.id ?? "");
    setCourtId("");
    setDate("");
    setStartTime("15:00");
    setEndTime("16:00");
    setTotalPrice("45000");
    setDepositAmount("0");
    setDepositPaid(false);
    setPaymentMethod("cash");
    setNotes("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!complexId || !courtId || !date || !startTime || !endTime) {
      uiToast({ title: "Faltan datos", description: "Completá complejo, cancha, fecha e horario." });
      return;
    }

    const s = toTimeWithSeconds(startTime);
    const eTime = toTimeWithSeconds(endTime);

    if (s >= eTime) {
      uiToast({ title: "Horario inválido", description: "El inicio debe ser anterior al fin." });
      return;
    }

    setLoading(true);
    const creating = uiToast({ title: "Creando reserva", description: "Comprobando disponibilidad..." });

    try {
      const conflict = await checkOverlap(courtId, date, s, eTime);
      if (conflict) {
        creating.update?.({
          title: "Conflicto de horario",
          description: "La cancha tiene otra reserva en ese horario.",
        } as any);
        setLoading(false);
        return;
      }

      const payload = {
        user_id: authUserId, // owner como creador (puedes adaptar si asignás a cliente)
        complex_id: complexId,
        court_id: courtId,
        reservation_date: date, // YYYY-MM-DD (string)
        start_time: s,
        end_time: eTime,
        total_price: totalPrice ? parseFloat(totalPrice) : null,
        deposit_amount: depositAmount ? parseFloat(depositAmount) : 0,
        deposit_paid: depositPaid,
        payment_method: paymentMethod,
        payment_status: "pending",
        mercadopago_payment_id: null,
        notes: notes || null,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("reservations")
        .insert([payload])
        .select("*")
        .single();

      if (insertErr) throw insertErr;

      // fetch nested info para UI (complex, court, profile)
      const [complexInfo] = await Promise.all([
        (async () => {
          const { data } = await supabase.from("sport_complexes").select("id, name, owner_id").eq("id", inserted.complex_id).maybeSingle();
          return data;
        })(),
      ]);

      const [courtInfo] = await Promise.all([
        (async () => {
          const { data } = await supabase.from("sport_courts").select("id, name, sport").eq("id", inserted.court_id).maybeSingle();
          return data;
        })(),
      ]);

      const [profileInfo] = await Promise.all([
        (async () => {
          const { data } = await supabase.from("profiles").select("full_name").eq("user_id", inserted.user_id).maybeSingle();
          return data;
        })(),
      ]);

      const mapped: OwnerReservation = {
        reservation_id: inserted.id,
        user_id: inserted.user_id,
        complex_id: inserted.complex_id,
        court_id: inserted.court_id,
        reservation_date: inserted.reservation_date,
        start_time: inserted.start_time,
        end_time: inserted.end_time,
        total_price: inserted.total_price,
        deposit_amount: inserted.deposit_amount,
        deposit_paid: inserted.deposit_paid,
        payment_method: inserted.payment_method,
        payment_status: inserted.payment_status as "pending" | "approved" | "cancelled" | "paid",
        notes: inserted.notes,
        created_at: inserted.created_at,
        updated_at: inserted.updated_at,
        sport_complexes: complexInfo ? { id: complexInfo.id, name: complexInfo.name, owner_id: complexInfo.owner_id } : undefined,
        sport_courts: courtInfo ? { id: courtInfo.id, name: courtInfo.name, sport: courtInfo.sport } : undefined,
        profiles: profileInfo ? { full_name: profileInfo.full_name } : undefined,
      };

      creating.update?.({
        title: "Reserva creada",
        description: "La reserva fue creada correctamente.",
      } as any);

      // permitir al caller añadir la reserva al estado global
      onCreated?.(mapped);

      // close + reset
      setTimeout(() => creating.dismiss?.(), 1200);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Error creando reserva:", err);
      creating.update?.({
        title: "Error creando reserva",
        description: err?.message ?? "Ocurrió un error al crear la reserva",
      } as any);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!loading) onClose();
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-white rounded-t-lg sm:rounded-lg shadow-lg overflow-auto"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Crear reserva (owner)</CardTitle>
                <CardDescription>Agregá una reserva en tu cancha — mobile-first</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="uppercase text-xs">Owner</Badge>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => !loading && onClose()}
                  className="p-1 rounded hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 p-4">
            <div>
              <label className="text-xs text-muted-foreground">Complejo</label>
              <select
                className="w-full border rounded px-3 py-2 mt-1"
                value={complexId}
                onChange={(e) => setComplexId(e.target.value)}
                required
              >
                <option value="">Seleccionar complejo</option>
                {complexes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Cancha</label>
              <select
                className="w-full border rounded px-3 py-2 mt-1"
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                required
              >
                <option value="">Seleccionar cancha</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.sport}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Fecha</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Inicio</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="time"
                  step={60}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Fin</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="time"
                  step={60}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Precio total (ARS)</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  inputMode="numeric"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Depósito (ARS)</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  inputMode="numeric"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <label className="flex items-center gap-2 mt-1 text-xs">
                  <input
                    type="checkbox"
                    checked={depositPaid}
                    onChange={(e) => setDepositPaid(e.target.checked)}
                  />
                  <span>Depósito pagado</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Método de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option value="cash">Efectivo</option>
                  <option value="mercado_pago">Mercado Pago</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Estado</label>
                <select className="w-full border rounded px-3 py-2 mt-1" value={"pending"} disabled>
                  <option value="pending">Pending (por defecto)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Notas</label>
              <textarea
                className="w-full border rounded px-3 py-2 mt-1 min-h-[80px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Apellido del cliente, teléfono, detalle..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => onClose()} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear reserva"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
