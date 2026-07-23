import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Court = { id: string; name: string; sport: string };

// Kept as a compatibility type for existing owner dashboard consumers.
export interface OwnerReservation {
  reservation_id: string;
  user_id: string | null;
  complex_id: string;
  court_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_price?: number;
  payment_status?: "pending" | "approved" | "paid" | "cancelled";
  sport_complexes?: { id?: string; name?: string; owner_id?: string };
  sport_courts?: { id?: string; name?: string; sport?: string };
  profiles?: { full_name?: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  complexId: string;
  onCreated: () => void;
}

export default function CreateReservationModal({ isOpen, onClose, complexId, onCreated }: Props) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtId, setCourtId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("16:00");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const loadCourts = async () => {
      const { data, error } = await supabase.from("sport_courts").select("id, name, sport").eq("complex_id", complexId).eq("is_active", true).order("name");
      if (error) {
        toast({ title: "No se pudieron cargar las canchas", description: error.message, variant: "destructive" });
        return;
      }
      const availableCourts = (data ?? []) as Court[];
      setCourts(availableCourts);
      setCourtId(availableCourts[0]?.id ?? "");
    };
    void loadCourts();
  }, [complexId, isOpen, toast]);

  if (!isOpen) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!courtId || !date || !guestName.trim()) {
      toast({ title: "Faltan datos", description: "Selecciona cancha, fecha y nombre del cliente.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase.rpc as any)("create_owner_reservation", {
      p_court_id: courtId,
      p_reservation_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_payment_method: paymentMethod,
      p_guest_name: guestName.trim(),
      p_guest_phone: guestPhone.trim() || null,
      p_notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "No se pudo registrar la reserva", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reserva manual registrada", description: "El importe se calculó desde el precio configurado de la cancha." });
    onCreated();
    onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
      <CardHeader><CardTitle>Registrar reserva manual</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="manual-guest">Cliente</Label><Input id="manual-guest" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={120} required /></div>
            <div className="space-y-2"><Label htmlFor="manual-phone">Telefono</Label><Input id="manual-phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} maxLength={32} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="manual-court">Cancha</Label><select id="manual-court" className="w-full border rounded-md h-10 px-3" value={courtId} onChange={(e) => setCourtId(e.target.value)} required><option value="">Seleccionar</option>{courts.map((court) => <option key={court.id} value={court.id}>{court.name} - {court.sport}</option>)}</select></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label htmlFor="manual-date">Fecha</Label><Input id="manual-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="manual-start">Inicio</Label><Input id="manual-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="manual-end">Fin</Label><Input id="manual-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="manual-payment">Metodo de pago</Label><select id="manual-payment" className="w-full border rounded-md h-10 px-3" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="mercado_pago">Mercado Pago</option></select></div>
          <div className="space-y-2"><Label htmlFor="manual-notes">Notas</Label><Textarea id="manual-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></div>
          <p className="text-sm text-muted-foreground">El precio y la seña los calcula el servidor usando la cancha seleccionada.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? "Registrando..." : "Registrar reserva"}</Button></div>
        </form>
      </CardContent>
    </Card>
  </div>;
}
