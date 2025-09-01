import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // Generate time slots for the day (every hour from 9 AM to 10 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 22; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(timeString);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    if (selectedCourt && selectedDate) {
      fetchAvailableSlots(selectedCourt, selectedDate.toISOString().split('T')[0])
        .then(setAvailableSlots);
    }
  }, [selectedCourt, selectedDate]);

  useEffect(() => {
    if (selectedCourt && startTime && endTime) {
      calculatePrice();
    }
  }, [selectedCourt, startTime, endTime]);

  const calculatePrice = () => {
    const court = complex.courts?.find(c => c.id === selectedCourt);
    if (!court || !startTime || !endTime) return;

    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    const hours = end - start;
    
    const hourlyPrice = court.hourly_price || 2000;
    setTotalPrice(hours * hourlyPrice);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate || !selectedCourt || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Check availability first
      const isAvailable = await checkSlotAvailability(
        selectedCourt,
        selectedDate.toISOString().split('T')[0],
        startTime,
        endTime
      );

      if (!isAvailable) {
        toast({
          title: "Error",
          description: "El horario seleccionado ya no está disponible",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const depositAmount = paymentMethod === 'cash' ? totalPrice * 0.3 : 0; // 30% deposit for cash

      const reservationData = {
        user_id: user.id,
        complex_id: complex.id,
        court_id: selectedCourt,
        reservation_date: selectedDate.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cash' ? 'pending' : 'pending' as any,
        deposit_amount: depositAmount,
        deposit_paid: false,
        notes: notes || undefined
      };

      const { data, error } = await createReservation(reservationData);

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Handle payment based on method
      if (paymentMethod === 'mercado_pago') {
        await handleMercadoPagoPayment(data.id);
      } else if (paymentMethod === 'transfer') {
        await handleBankTransfer(data);
      } else {
        await handleCashPayment(data);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (reservation: any, paymentMethod: string) => {
    try {
      const court = complex.courts?.find(c => c.id === selectedCourt);

      console.log('complex',complex);

      const message = `🏟️ *NUEVA RESERVA*\n\n` +
        `📍 Complejo: ${complex.name}\n` +
        `🏐 Cancha: ${court?.name} (${court?.sport})\n` +
        `📅 Fecha: ${selectedDate?.toLocaleDateString('es-ES')}\n` +
        `🕐 Horario: ${startTime} - ${endTime}\n` +
        `💰 Total: $${totalPrice}\n` +
        `💳 Método de pago: ${paymentMethod === 'transfer' ? 'Transferencia' : paymentMethod === 'cash' ? 'Efectivo' : 'MercadoPago'}\n` +
        `${paymentMethod === 'cash' ? `💵 Seña requerida: $${Math.round(totalPrice * 0.3)}\n` : ''}` +
        `${notes ? `📝 Notas: ${notes}\n` : ''}` +
        `\n📞 Contactar al cliente para confirmar`;

      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          phoneNumber: complex.whatsapp || complex.phone || '5493884486112',
          message,
          complexName: complex.name,
          reservationId: reservation.id
        }
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error sending WhatsApp notification:', error);
      throw error;
    }
  };

  const handleMercadoPagoPayment = async (reservationId: string) => {
    try {
      await sendWhatsAppNotification({ id: reservationId }, 'mercado_pago');
      toast({
        title: "Reserva creada",
        description: "Se ha enviado la notificación por WhatsApp. Te contactaremos para coordinar el pago por MercadoPago."
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Reserva creada pero no se pudo enviar la notificación",
        variant: "destructive"
      });
      onClose();
    }
  };

  const handleBankTransfer = async (reservation: any) => {
    try {
      await sendWhatsAppNotification(reservation, 'transfer');
      toast({
        title: "Reserva creada",
        description: "Se ha enviado la notificación por WhatsApp. Te contactaremos con los datos para la transferencia."
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Reserva creada",
        description: "Te contactaremos con los datos para la transferencia bancaria"
      });
      onClose();
    }
  };

  const handleCashPayment = async (reservation: any) => {
    try {
      const depositAmount = totalPrice * 0.3;
      await sendWhatsAppNotification(reservation, 'cash');
      toast({
        title: "Reserva creada",
        description: `Se ha enviado la notificación por WhatsApp. Debes pagar una seña de $${depositAmount} para confirmar tu reserva.`
      });
      onClose();
    } catch (error: any) {
      const depositAmount = totalPrice * 0.3;
      toast({
        title: "Reserva creada",
        description: `Debes pagar una seña de $${depositAmount} para confirmar tu reserva. Te contactaremos para coordinar el pago.`
      });
      onClose();
    }
  };

  const isTimeSlotAvailable = (time: string) => {
    if (!selectedDate || !selectedCourt) return true;
    
    // This is a simplified check - in a real app you'd check against actual reservations
    return true;
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
            <Select value={selectedCourt} onValueChange={setSelectedCourt}>
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
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date() || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
              className="rounded-md border w-fit"
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora de inicio</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.slice(0, -1).map((time) => (
                    <SelectItem key={time} value={time} disabled={!isTimeSlotAvailable(time)}>
                      {time}
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
                  {timeSlots.filter(time => {
                    if (!startTime) return false;
                    const startHour = parseInt(startTime.split(':')[0]);
                    const timeHour = parseInt(time.split(':')[0]);
                    return timeHour > startHour;
                  }).map((time) => (
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