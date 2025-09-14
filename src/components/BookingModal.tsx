import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, CreditCard, DollarSign, Smartphone } from "lucide-react";
import { SportComplexData } from "@/hooks/useComplexes";
import { useReservations } from "@/hooks/useReservations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BookingModalProps {
  complex: SportComplexData;
  isOpen: boolean;
  onClose: () => void;
}

type Block = { start: string; end: string }; // "HH:MM"

const BookingModal = ({ complex, isOpen, onClose }: BookingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createReservation, fetchAvailableSlots, checkSlotAvailability } = useReservations();
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedCourt, setSelectedCourt] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<'mercado_pago' | 'transfer' | 'cash'>('mercado_pago');
  const [notes, setNotes] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  
  const ymd = useMemo(
    () => (selectedDate ? new Date(selectedDate).toISOString().slice(0, 10) : null),
    [selectedDate ? selectedDate.toDateString() : null]
  );
  const lastFetchKey = useRef<string | null>(null);
  // 🔒 bloques ocupados en el día/cancha
  const [busyBlocks, setBusyBlocks] = useState<Block[]>([]);

 // helpers de solapamiento (dejá esto donde prefieras)
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  Math.max(toMinutes(aStart), toMinutes(bStart)) < Math.min(toMinutes(aEnd), toMinutes(bEnd));

  const isRangeFree = (from: string, to: string) =>
    !busyBlocks.some(b => overlaps(from, to, b.start, b.end));
  const isStartSlotFree = (time: string) => {
    // bloque de 1h [time, time+1h) libre
    const end = `${(parseInt(time.substring(0,2)) + 1).toString().padStart(2,"0")}:00`;
    return isRangeFree(time, end);
  };

  // ---- slots 09–22 ----
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();

  
  

  // 👉 traer reservas existentes (solo console.debug en errores)
  useEffect(() => {
    if (!isOpen || !selectedCourt || !ymd) return;
  
    const key = `${selectedCourt}-${ymd}`;
    if (lastFetchKey.current === key) return; // ya buscado
    lastFetchKey.current = key;
  
    (async () => {
      try {
        setBusyBlocks([]);
        setStartTime("");
        setEndTime("");
  
        // OJO: no pedimos 'status' porque tu tabla no lo tiene.
        const { data, error } = await supabase
          .from("reservations")
          .select("start_time,end_time")
          .eq("court_id", selectedCourt)
          .eq("reservation_date", ymd);
  
        if (error || !Array.isArray(data)) {
          console.debug("reservations fetch warn:", error || "empty");
          return; // no toast si vino 200 raro
        }
  
        const blocks = data
          .map((r: any) => ({
            start: (r.start_time as string).slice(0, 5),
            end: (r.end_time as string).slice(0, 5),
          }))
          .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  
        setBusyBlocks(blocks);
      } catch (e) {
        console.debug("reservations fetch error:", e);
      }
    })();
  }, [isOpen, selectedCourt, ymd]);
  

  // recalcular precio
  useEffect(() => {
    if (selectedCourt && startTime && endTime) {
      const court = complex.courts?.find(c => c.id === selectedCourt);
      if (!court) return;
      const start = parseInt(startTime.split(':')[0], 10);
      const end = parseInt(endTime.split(':')[0], 10);
      const hours = Math.max(0, end - start);
      const hourlyPrice = court.hourly_price || 2000;
      setTotalPrice(hours * hourlyPrice);
    } else {
      setTotalPrice(0);
    }
  }, [selectedCourt, startTime, endTime, complex.courts]);
  
  // opciones válidas para hora de fin (sin pisar reservas)
  const endTimeOptions = timeSlots.filter(time => {
    if (!startTime) return false;
    const startHour = parseInt(startTime.split(":")[0], 10);
    const timeHour  = parseInt(time.split(":")[0], 10);
    if (timeHour <= startHour) return false;
    return isRangeFree(startTime, time);
  });


  // -------------------- submit --------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate || !selectedCourt || !startTime || !endTime) {
      toast({ title: "Error", description: "Por favor completa todos los campos requeridos", variant: "destructive" });
      return;
    }

    // chequeo local por las dudas
    if (!isRangeFree(startTime, endTime)) {
      toast({ title: "Horario ocupado", description: "El rango elegido se superpone con otra reserva.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // chequeo en servidor por condiciones de carrera
      const isAvailable = await checkSlotAvailability(
        selectedCourt,
        selectedDate.toISOString().split('T')[0],
        startTime,
        endTime
      );
      if (!isAvailable) {
        toast({ title: "Error", description: "El horario seleccionado ya no está disponible", variant: "destructive" });
        setLoading(false);
        return;
      }

      const depositAmount = paymentMethod === 'cash' ? totalPrice * 0.3 : 0;

      const reservationData = {
        user_id: user.id,
        complex_id: complex.id,
        court_id: selectedCourt,
        reservation_date: selectedDate.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        payment_method: paymentMethod,
        payment_status: 'pending' as any,
        deposit_amount: depositAmount,
        deposit_paid: false,
        notes: notes || undefined
      };

      const { data, error } = await createReservation(reservationData);
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
        setLoading(false);
        return;
      }

      // pagos / notificaciones (igual que tenías)
      if (paymentMethod === 'mercado_pago') {
        await handleMercadoPagoPayment(data.id);
      } else if (paymentMethod === 'transfer') {
        await handleBankTransfer(data);
      } else {
        await handleCashPayment(data);
      }

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ------------ notificaciones (sin cambios funcionales) ------------
  const sendWhatsAppNotification = async (reservation: any, method: string) => {
    try {
      const court = complex.courts?.find(c => c.id === selectedCourt);
      const message =
        `🏟️ *NUEVA RESERVA*\n\n` +
        `📍 Complejo: ${complex.name}\n` +
        `🏐 Cancha: ${court?.name} (${court?.sport})\n` +
        `📅 Fecha: ${selectedDate?.toLocaleDateString('es-ES')}\n` +
        `🕐 Horario: ${startTime} - ${endTime}\n` +
        `💰 Total: $${totalPrice}\n` +
        `💳 Método de pago: ${method === 'transfer' ? 'Transferencia' : method === 'cash' ? 'Efectivo' : 'MercadoPago'}\n` +
        `${method === 'cash' ? `💵 Seña requerida: $${Math.round(totalPrice * 0.3)}\n` : ''}` +
        `${notes ? `📝 Notas: ${notes}\n` : ''}` +
        `\n📞 Contactar al cliente para confirmar`;

      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          phoneNumber: complex.whatsapp || complex.phone || '5491133334444',
          message,
          complexName: complex.name,
          reservationId: reservation.id
        }
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.debug('sendWhatsAppNotification warn:', e);
      throw e;
    }
  };

  const handleMercadoPagoPayment = async (reservationId: string) => {
    try {
      await sendWhatsAppNotification({ id: reservationId }, 'mercado_pago');
      toast({ title: "Reserva creada", description: "Se envió la notificación por WhatsApp. Te contactaremos para coordinar el pago por MercadoPago." });
      onClose();
    } catch {
      toast({ title: "Error", description: "Reserva creada pero no se pudo enviar la notificación", variant: "destructive" });
      onClose();
    }
  };

  const handleBankTransfer = async (reservation: any) => {
    try {
      await sendWhatsAppNotification(reservation, 'transfer');
      toast({ title: "Reserva creada", description: "Se envió la notificación por WhatsApp. Te contactaremos con los datos para la transferencia." });
      onClose();
    } catch {
      toast({ title: "Reserva creada", description: "Te contactaremos con los datos para la transferencia bancaria" });
      onClose();
    }
  };

  const handleCashPayment = async (reservation: any) => {
    try {
      const depositAmount = totalPrice * 0.3;
      await sendWhatsAppNotification(reservation, 'cash');
      toast({ title: "Reserva creada", description: `Se envió la notificación. Debes pagar una seña de $${Math.round(depositAmount)}.` });
      onClose();
    } catch {
      const depositAmount = totalPrice * 0.3;
      toast({ title: "Reserva creada", description: `Debes pagar una seña de $${Math.round(depositAmount)}. Te contactaremos para coordinar el pago.` });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Reservar cancha en {complex.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Court Selection */}
          <div className="space-y-2">
            <Label>Seleccionar cancha</Label>
            <Select
              value={selectedCourt}
              onValueChange={(v) => { setSelectedCourt(v); setStartTime(""); setEndTime(""); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elige una cancha" />
              </SelectTrigger>
              <SelectContent>
                {complex.courts?.map((court) => (
                  <SelectItem key={court.id} value={court.id}>
                    {court.name} - {court.sport} - ${court.hourly_price || 2000}/hora
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Fecha de reserva</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setStartTime(""); setEndTime(""); }}
              disabled={(date) =>
                date < new Date(new Date().setHours(0,0,0,0)) ||
                date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              }
              className="rounded-md border w-fit"
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora de inicio</Label>
              <Select value={startTime} onValueChange={(v) => { setStartTime(v); setEndTime(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.slice(0, -1).map((time) => (
                    <SelectItem key={time} value={time} disabled={!isStartSlotFree(time)}>
                      {time}{!isStartSlotFree(time) ? " (ocupado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hora de fin</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {endTimeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-1 gap-3">
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'mercado_pago' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setPaymentMethod('mercado_pago')}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">MercadoPago</p>
                    <p className="text-sm text-muted-foreground">Pago online seguro</p>
                  </div>
                </div>
              </div>

              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'transfer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setPaymentMethod('transfer')}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Transferencia Bancaria</p>
                    <p className="text-sm text-muted-foreground">Coordinamos los datos contigo</p>
                  </div>
                </div>
              </div>

              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setPaymentMethod('cash')}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Efectivo</p>
                    <p className="text-sm text-muted-foreground">
                      Seña del 30% requerida ({totalPrice > 0 ? `$${Math.round(totalPrice * 0.3)}` : '$0'})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas adicionales (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cualquier información adicional..."
              rows={3}
            />
          </div>

          {/* Price Summary */}
          {totalPrice > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total a pagar:</span>
                <Badge variant="default" className="text-lg px-3 py-1">
                  ${totalPrice}
                </Badge>
              </div>
              {paymentMethod === 'cash' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Seña requerida: ${Math.round(totalPrice * 0.3)} (30%)
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !selectedDate || !selectedCourt || !startTime || !endTime} className="flex-1">
              {loading ? "Procesando..." : "Confirmar Reserva"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
