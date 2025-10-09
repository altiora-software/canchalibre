// components/CreateReservationModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast as uiToast } from "@/hooks/use-toast";

type PaymentMethod = "cash" | "mercado_pago" | string;

export interface OwnerReservation {
  reservation_id: string;
  user_id: string;
  complex_id: string;
  court_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_price?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  payment_method?: PaymentMethod;
  payment_status?: "pending" | "approved" | "cancelled" | "paid";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  sport_complexes?: { id?: string; name?: string; owner_id?: string };
  sport_courts?: { id?: string; name?: string; sport?: string };
  profiles?: { full_name?: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  authUserId: string;
  onCreated?: (reservation: OwnerReservation) => void;
}

export default function CreateReservationModal({ isOpen, onClose, authUserId, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);

  const [complexes, setComplexes] = useState<Array<{ id: string; name: string }>>([]);
  const [courts, setCourts] = useState<Array<{ id: string; name: string; sport: string }>>([]);

  const [complexId, setComplexId] = useState<string>("");
  const [courtId, setCourtId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("15:00");
  const [endTime, setEndTime] = useState<string>("16:00");
  const [totalPrice, setTotalPrice] = useState<string>("45000");
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [depositPaid, setDepositPaid] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState<string>("");

  const firstInputRef = useRef<HTMLSelectElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // prevent body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // focus first input slightly after render
      setTimeout(() => firstInputRef.current?.focus(), 120);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, loading, onClose]);

  const checkPendingReservation = async () => {
    try {
        const { data: pendingCheck, error: pendingErr } = await supabase
          .from("reservations")
          .select("id")
          .eq("user_id", authUserId)
          .eq("complex_id", complexId)
          .eq("payment_status", "pending")
          .limit(1)
          .maybeSingle();
      console.log('data', pendingCheck)
      console.log('error', pendingErr)
        if (pendingErr) {
          console.warn("No se pudo comprobar reservas pendientes:", pendingErr);
          // opcional: permitir continuar y dejar que la DB haga la última validación
        } else if (pendingCheck) {
          uiToast({
            title: "Reserva pendiente",
            description: "Ya tenés una reserva pendiente para este complejo. Cancelala o finalizala antes de crear otra.",
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error comprobando pendientes (frontend):", err);
        // opcional: seguir y dejar que DB bloquee si es necesario
      }
  }

  // load owner profile id and complexes once when open
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("user_id", authUserId)
          .single();

        if (profileErr) {
          console.warn("No se pudo obtener profile:", profileErr);
        } else {
          setOwnerProfileId(profileData.id);
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
            if ((comps ?? []).length > 0) {
              setComplexId(comps![0].id);
              // small delay to let select render before focusing
              setTimeout(() => firstInputRef.current?.focus(), 80);
            }
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

  const toTimeWithSeconds = (hhmm: string) => (hhmm.length === 5 ? `${hhmm}:00` : hhmm || "00:00:00");

  const checkOverlap = async (court_id: string, reservation_date: string, start: string, end: string) => {
    console.log('entro a checkoverlap 177')
    checkPendingReservation();
    const { data: conflicts, error } = await supabase
      .from("reservations")
      .select("id, start_time, end_time")
      .eq("court_id", court_id)
      .eq("reservation_date", reservation_date)
      .filter("start_time", "lt", end)
      .filter("end_time", "gt", start);
    console.log('conflict', conflicts)
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
        
        checkPendingReservation();
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
      checkPendingReservation();
      console.log('antes del payload 233')

      const payload = {
        user_id: authUserId,
        complex_id: complexId,
        court_id: courtId,
        reservation_date: date,
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
        console.log('inserted', inserted)
        console.log('insertErr', insertErr)

      if (insertErr) throw insertErr;

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

      onCreated?.(mapped);

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
    <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    aria-modal="true"
    role="dialog"
    >
      {/* backdrop */}
      <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { if (!loading) onClose(); }}
        />

      {/* sheet / modal */}
      <div
        ref={sheetRef}
        className="
        relative
        w-full
        max-w-xl
        bg-surface
        rounded-t-xl
        sm:rounded-xl
        shadow-2xl
        transform
        transition-all
        duration-200
        ease-out
        overflow-hidden
        flex
        flex-col
        max-h-[90vh]
        "
    >
        <form
            onSubmit={handleSubmit}
            className="overflow-auto px-4 py-4 flex-1">
    
            <Card>
            <CardHeader className="sticky top-0 bg-white z-10 border-b">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Crear reserva</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">Agregá una reserva en tu cancha</CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="uppercase text-xs">Owner</Badge>
                  <button
                    type="button"
                    aria-label="Cerrar"
                    onClick={() => !loading && onClose()}
                    className="p-2 rounded-md hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-4 sm:p-6">
              {/* COMPLEJO */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Complejo</label>
                <select
                  ref={firstInputRef}
                  className="w-full border rounded-md px-3 py-3 text-sm"
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

              {/* CANCHA */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cancha</label>
                <select
                  className="w-full border rounded-md px-3 py-3 text-sm"
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

              {/* fecha / horas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Fecha</label>
                  <input
                    className="w-full border rounded-md px-3 py-3 text-sm"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Inicio</label>
                  <input
                    className="w-full border rounded-md px-3 py-3 text-sm"
                    type="time"
                    step={60}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Fin</label>
                  <input
                    className="w-full border rounded-md px-3 py-3 text-sm"
                    type="time"
                    step={60}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* precios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Precio total (ARS)</label>
                  <input
                    className="w-full border rounded-md px-3 py-3 text-sm"
                    inputMode="numeric"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Depósito (ARS)</label>
                  <input
                    className="w-full border rounded-md px-3 py-3 text-sm"
                    inputMode="numeric"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <label className="flex items-center gap-2 mt-2 text-sm">
                    <input
                      type="checkbox"
                      checked={depositPaid}
                      onChange={(e) => setDepositPaid(e.target.checked)}
                    />
                    <span className="text-sm">Depósito pagado</span>
                  </label>
                </div>
              </div>

              {/* metodo / estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Método de pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border rounded-md px-3 py-3 text-sm"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="mercado_pago">Mercado Pago</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Estado</label>
                  <select className="w-full border rounded-md px-3 py-3 text-sm" value={"pending"} disabled>
                    <option value="pending">Pending (por defecto)</option>
                  </select>
                </div>
              </div>

              {/* notas */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Notas</label>
                <textarea
                  className="w-full border rounded-md px-3 py-3 text-sm min-h-[100px] resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Apellido del cliente, teléfono, detalle..."
                />
              </div>

              {/* actions */}
              <div className="flex flex-col sm:flex-row gap-2 justify-end mt-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onClose()}
                    disabled={loading}
                    className="w-full sm:w-auto"
                >
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? "Creando..." : "Crear reserva"}
                </Button>
            </div>


            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
