import { useState, useEffect, useMemo } from "react";
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

const DEBUG = true;

/** Helpers */
const pad = (n: number) => n.toString().padStart(2, "0");
const formatLocalDateYYYYMMDD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type FreeSlot = { start: string; end: string };

interface BookingModalProps {
  complex: SportComplexData;
  isOpen: boolean;
  onClose: () => void;
}

const BookingModal = ({ complex, isOpen, onClose }: BookingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createReservation, fetchAvailableSlots, checkSlotAvailability } = useReservations();

  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedCourt, setSelectedCourt] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"mercado_pago" | "transfer" | "cash">("mercado_pago");
  const [notes, setNotes] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<FreeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // Cargar slots cuando cambian cancha/fecha
  useEffect(() => {
    (async () => {
      if (!selectedCourt || !selectedDate) return;
      const dateStr = formatLocalDateYYYYMMDD(selectedDate);

      if (DEBUG) {
        console.groupCollapsed("[modal] cargar slots");
        console.log("selectedCourt:", selectedCourt, "selectedDate:", dateStr);
      }

      const slots = await fetchAvailableSlots(selectedCourt, dateStr);

      if (DEBUG) {
        console.log("slots recibidos:", slots.length);
        if (slots.length <= 40) console.table(slots);
        console.groupEnd();
      }

      setAvailableSlots(slots);
      setStartTime("");
      setEndTime("");
    })();
  }, [selectedCourt, selectedDate, fetchAvailableSlots]);

  // Recalcular precio
  useEffect(() => {
    if (!selectedCourt || !startTime || !endTime) return;
    const court = complex.courts?.find((c) => c.id === selectedCourt);
    if (!court) return;
    const startHour = parseInt(startTime.split(":")[0], 10);
    const endHour = parseInt(endTime.split(":")[0], 10);
    const hours = Math.max(0, endHour - startHour);
    const hourlyPrice = court.hourly_price || 2000;
    const price = hours * hourlyPrice;
    setTotalPrice(price);

    if (DEBUG) {
      console.log("[modal] calcular precio →", { startTime, endTime, hours, hourlyPrice, total: price });
    }
  }, [complex.courts, selectedCourt, startTime, endTime]);

  const startOptions = useMemo(
    () => Array.from(new Set(availableSlots.map((s) => s.start))).sort(),
    [availableSlots]
  );

  const endOptionsFrom = (start?: string) => {
    if (!start) return [];
    const starts = new Set(availableSlots.map((s) => s.start));
    const ends = new Set(availableSlots.map((s) => s.end));
    const out: string[] = [];
    let cur = start;

    while (true) {
      const [h, m] = cur.split(":").map(Number);
      const nextEnd = `${pad((h || 0) + 1)}:${pad(m || 0)}`;
      if (!ends.has(nextEnd)) break;
      out.push(nextEnd);
      const nextStart = nextEnd;
      if (!starts.has(nextStart)) break;
      cur = nextStart;
    }

    if (DEBUG) console.log("[modal] endOptionsFrom(", start, ") →", out);
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate || !selectedCourt || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const dateStr = formatLocalDateYYYYMMDD(selectedDate);

      if (DEBUG) {
        console.groupCollapsed("[modal] submit");
        console.log("payload draft:", {
          user_id: user.id,
          complex_id: complex.id,
          court_id: selectedCourt,
          dateStr,
          startTime,
          endTime,
          paymentMethod,
          notes,
        });
      }

      const isAvailable = await checkSlotAvailability(selectedCourt, dateStr, startTime, endTime);
      if (DEBUG) console.log("checkSlotAvailability →", isAvailable);

      if (!isAvailable) {
        toast({
          title: "Error",
          description: "El horario seleccionado ya no está disponible",
          variant: "destructive",
        });
        setLoading(false);
        if (DEBUG) console.groupEnd();
        return;
      }

      const depositAmount = paymentMethod === "cash" ? totalPrice * 0.3 : 0;

      const reservationData = {
        user_id: user.id,
        complex_id: complex.id,
        court_id: selectedCourt,
        reservation_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        payment_method: paymentMethod,
        payment_status: "pending" as const,
        deposit_amount: depositAmount,
        deposit_paid: false,
        notes: notes || undefined,
      };

      if (DEBUG) console.log("createReservation payload:", reservationData);

      const { data, error } = await createReservation(reservationData as any);
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
        setLoading(false);
        if (DEBUG) console.groupEnd();
        return;
      }

      if (DEBUG) console.log("createReservation OK →", data);

      if (paymentMethod === "mercado_pago") {
        await handleMercadoPagoPayment(data.id);
      } else if (paymentMethod === "transfer") {
        await handleBankTransfer(data);
      } else {
        await handleCashPayment(data);
      }

      if (DEBUG) console.groupEnd();
    } catch (error: any) {
      if (DEBUG) console.error("[modal] submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al crear la reserva",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (reservation: any, payMethod: string) => {
    try {
      const court = complex.courts?.find((c) => c.id === selectedCourt);
      const message =
        `🏟️ *NUEVA RESERVA*\n\n` +
        `📍 Complejo: ${complex.name}\n` +
        `🏐 Cancha: ${court?.name} (${court?.sport})\n` +
        `📅 Fecha: ${selectedDate?.toLocaleDateString("es-ES")}\n` +
        `🕐 Horario: ${startTime} - ${endTime}\n` +
        `💰 Total: $${totalPrice}\n` +
        `💳 Método de pago: ${payMethod === "transfer" ? "Transferencia" : payMethod === "cash" ? "Efectivo" : "MercadoPago"}\n` +
        `${payMethod === "cash" ? `💵 Seña requerida: $${Math.round(totalPrice * 0.3)}\n` : ""}` +
        `${notes ? `📝 Notas: ${notes}\n` : ""}` +
        `\n📞 Contactar al cliente para confirmar`;

      if (DEBUG) {
        console.groupCollapsed("[modal] sendWhatsAppNotification");
        console.log("to:", complex.whatsapp || complex.phone);
        console.log("message:", message);
      }

      const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
        body: {
          phoneNumber: complex.whatsapp || complex.phone || "5490000000000",
          message,
          complexName: complex.name,
          reservationId: reservation.id,
        },
      });

      if (error) throw error;
      if (DEBUG) {
        console.log("whatsapp response:", data);
        console.groupEnd();
      }
      return data;
    } catch (error: any) {
      if (DEBUG) console.error("[modal] whatsapp error:", error);
      throw error;
    }
  };

  const handleMercadoPagoPayment = async (reservationId: string) => {
    try {
      await sendWhatsAppNotification({ id: reservationId }, "mercado_pago");
      toast({
        title: "Reserva creada",
        description: "Se envió la notificación por WhatsApp. Te contactaremos para coordinar el pago por MercadoPago.",
      });
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Reserva creada pero no se pudo enviar la notificación",
        variant: "destructive",
      });
      onClose();
    }
  };

  const handleBankTransfer = async (reservation: any) => {
    try {
      await sendWhatsAppNotification(reservation, "transfer");
      toast({
        title: "Reserva creada",
        description: "Se envió la notificación por WhatsApp. Te contactaremos con los datos para la transferencia.",
      });
      onClose();
    } catch {
      toast({
        title: "Reserva creada",
        description: "Te contactaremos con los datos para la transferencia bancaria",
      });
      onClose();
    }
  };

  const handleCashPayment = async (reservation: any) => {
    try {
      const depositAmount = totalPrice * 0.3;
      await sendWhatsAppNotification(reservation, "cash");
      toast({
        title: "Reserva creada",
        description: `Se envió la notificación por WhatsApp. Debes pagar una seña de $${Math.round(
          depositAmount
        )} para confirmar tu reserva.`,
      });
      onClose();
    } catch {
      const depositAmount = totalPrice * 0.3;
      toast({
        title: "Reserva creada",
        description: `Debes pagar una seña de $${Math.round(
          depositAmount
        )} para confirmar tu reserva. Te contactaremos para coordinar el pago.`,
      });
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
              onValueChange={(v) => {
                if (DEBUG) console.log("[modal] change court →", v);
                setSelectedCourt(v);
              }}
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
              onSelect={(d) => {
                if (DEBUG) console.log("[modal] change date →", d ? formatLocalDateYYYYMMDD(d) : null);
                setSelectedDate(d);
              }}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              }
              className="rounded-md border w-fit"
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora de inicio</Label>
              <Select
                value={startTime}
                onValueChange={(v) => {
                  if (DEBUG) console.log("[modal] change startTime →", v);
                  setStartTime(v);
                  setEndTime("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCourt && selectedDate ? "Seleccionar" : "Elegí cancha y fecha"} />
                </SelectTrigger>
                <SelectContent>
                  {(!selectedCourt || !selectedDate) && (
                    <SelectItem value="__none__" disabled>
                      Elegí cancha y fecha
                    </SelectItem>
                  )}
                  {selectedCourt && selectedDate && startOptions.length === 0 && (
                    <SelectItem value="__no__" disabled>
                      No hay horarios disponibles
                    </SelectItem>
                  )}
                  {startOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {DEBUG && (
                <div className="text-xs text-muted-foreground">
                  startOptions: {startOptions.join(", ") || "(vacío)"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Hora de fin</Label>
              <Select
                value={endTime}
                onValueChange={(v) => {
                  if (DEBUG) console.log("[modal] change endTime →", v);
                  setEndTime(v);
                }}
                disabled={!startTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder={startTime ? "Seleccionar" : "Elegí hora de inicio"} />
                </SelectTrigger>
                <SelectContent>
                  {!startTime && (
                    <SelectItem value="__startfirst__" disabled>
                      Elegí hora de inicio
                    </SelectItem>
                  )}
                  {startTime && endOptionsFrom(startTime).length === 0 && (
                    <SelectItem value="__noend__" disabled>
                      No hay extensión disponible
                    </SelectItem>
                  )}
                  {startTime &&
                    endOptionsFrom(startTime).map((time) => (
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
                  paymentMethod === "mercado_pago" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setPaymentMethod("mercado_pago")}
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
                  paymentMethod === "transfer" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setPaymentMethod("transfer")}
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
                  paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setPaymentMethod("cash")}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Efectivo</p>
                    <p className="text-sm text-muted-foreground">
                      Seña del 30% requerida ({totalPrice > 0 ? `$${Math.round(totalPrice * 0.3)}` : "$0"})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas adicionales (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cualquier información adicional..." rows={3} />
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
              {paymentMethod === "cash" && (
                <p className="text-sm text-muted-foreground mt-2">Seña requerida: ${Math.round(totalPrice * 0.3)} (30%)</p>
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
