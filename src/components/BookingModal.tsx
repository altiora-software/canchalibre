import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Check, ChevronLeft, Clock, CreditCard, Loader2, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SportComplexData } from '@/hooks/useComplexes';
import { BookableSlot, useReservations } from '@/hooks/useReservations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BookingModalProps {
  complex: SportComplexData;
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = 'mercado_pago' | 'transfer' | 'cash';

const toLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (time: string) => time.slice(0, 5);
const formatCurrency = (amount: number | null | undefined) =>
  amount && amount > 0 ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount) : 'Precio a confirmar';

const BookingModal = ({ complex, isOpen, onClose }: BookingModalProps) => {
  const { toast } = useToast();
  const { createReservation, fetchBookableSlots } = useReservations();
  const activeCourts = useMemo(() => complex.courts?.filter((court) => court.id) ?? [], [complex.courts]);
  const [step, setStep] = useState(1);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookableSlot>();
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedCourt = activeCourts.find((court) => court.id === selectedCourtId);
  const dateKey = selectedDate ? toLocalDate(selectedDate) : null;

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSelectedCourtId('');
    setSelectedDate(undefined);
    setSelectedSlot(undefined);
    setSlots([]);
    setSlotsError(null);
    setNotes('');
    setPaymentMethod('transfer');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedCourtId || !dateKey) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlot(undefined);

    void fetchBookableSlots(selectedCourtId, dateKey)
      .then((availableSlots) => {
        if (!cancelled) setSlots(availableSlots);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setSlots([]);
          setSlotsError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => { cancelled = true; };
  }, [dateKey, fetchBookableSlots, isOpen, selectedCourtId]);

  const selectCourt = (courtId: string) => {
    setSelectedCourtId(courtId);
    setSelectedDate(undefined);
    setSelectedSlot(undefined);
    setSlots([]);
    setSlotsError(null);
  };

  const notifyComplex = async (reservationId: string) => {
    // The Edge Function derives recipient and message from the authorised reservation.
    const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
      body: { reservationId },
    });
    if (error) throw error;
  };

  const submitReservation = async () => {
    if (!selectedCourtId || !dateKey || !selectedSlot) return;
    setSubmitting(true);
    const { data, error } = await createReservation({
      court_id: selectedCourtId,
      reservation_date: dateKey,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
    });

    if (error || !data) {
      setSubmitting(false);
      toast({
        title: 'No pudimos confirmar el turno',
        description: error ?? 'Elegí otro horario e intentá nuevamente.',
        variant: 'destructive',
      });
      if (/no longer available|disponible|23P01/i.test(error ?? '')) setStep(2);
      return;
    }

    try {
      await notifyComplex(data.id);
      toast({ title: 'Solicitud recibida', description: 'El complejo recibió el aviso. Podés seguirla desde Mis reservas.' });
    } catch {
      toast({ title: 'Solicitud recibida', description: 'El complejo recibió tu reserva. Te contactará para coordinar el pago.' });
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  const canContinue = (currentStep: number) =>
    currentStep === 1 ? Boolean(selectedCourtId) : currentStep === 2 ? Boolean(selectedDate && selectedSlot) : true;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reservar en {complex.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">Tu turno se reserva al confirmar. El pago se coordina con el complejo.</p>
        </DialogHeader>

        <ol className="grid grid-cols-3 gap-2 text-sm" aria-label="Progreso de reserva">
          {['Cancha', 'Día y hora', 'Confirmar'].map((label, index) => {
            const current = index + 1;
            return <li key={label} className={`rounded-md px-3 py-2 text-center ${step >= current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{current}. {label}</li>;
          })}
        </ol>

        {step === 1 && (
          <section className="space-y-3" aria-labelledby="court-heading">
            <div><h2 id="court-heading" className="font-semibold">Elegí una cancha</h2><p className="text-sm text-muted-foreground">Mostramos sólo canchas activas del complejo.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeCourts.map((court) => (
                <button type="button" key={court.id} onClick={() => selectCourt(court.id)} className={`rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedCourtId === court.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold">{court.name}</span>{selectedCourtId === court.id && <Check className="h-5 w-5 text-primary" aria-label="Seleccionada" />}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{court.sport} · {court.players_capacity} jugadores</p>
                  <p className="mt-2 text-sm">Desde {formatCurrency(court.hourly_price)} / hora</p>
                </button>
              ))}
            </div>
            {!activeCourts.length && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Este complejo no tiene canchas disponibles para reservar.</p>}
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4" aria-labelledby="slot-heading">
            <div><h2 id="slot-heading" className="font-semibold">Elegí día y horario</h2><p className="text-sm text-muted-foreground">Los horarios se consultan en tiempo real y pueden cambiar antes de confirmar.</p></div>
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date > new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} className="rounded-md border" />
            {dateKey && <div className="space-y-2"><Label>Turnos disponibles {selectedCourt ? `para ${selectedCourt.name}` : ''}</Label>
              {slotsLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando horarios…</p>}
              {slotsError && <p role="alert" className="text-sm text-destructive">{slotsError}</p>}
              {!slotsLoading && !slotsError && !slots.length && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">No hay turnos publicados para esta fecha. Probá otro día o contactá al complejo.</p>}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map((slot) => {
                const selected = selectedSlot?.start_time === slot.start_time && selectedSlot?.end_time === slot.end_time;
                return <Button key={`${slot.start_time}-${slot.end_time}`} type="button" variant={selected ? 'default' : 'outline'} onClick={() => setSelectedSlot(slot)}>{formatTime(slot.start_time)}</Button>;
              })}</div>
            </div>}
          </section>
        )}

        {step === 3 && selectedCourt && selectedDate && selectedSlot && (
          <section className="space-y-4" aria-labelledby="confirmation-heading">
            <div><h2 id="confirmation-heading" className="font-semibold">Revisá tu solicitud</h2><p className="text-sm text-muted-foreground">El importe final y cualquier seña se calculan en el servidor al confirmar.</p></div>
            <div className="rounded-lg bg-muted p-4 text-sm space-y-1"><p><strong>Cancha:</strong> {selectedCourt.name}</p><p><strong>Fecha:</strong> {selectedDate.toLocaleDateString('es-AR')}</p><p><strong>Horario:</strong> {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}</p><p><strong>Precio publicado:</strong> desde {formatCurrency(selectedCourt.hourly_price)} / hora</p></div>
            <div className="space-y-2"><Label>Cómo coordinás el pago</Label><div className="grid gap-2 sm:grid-cols-3">
              {([{ value: 'transfer', label: 'Transferencia', icon: Smartphone }, { value: 'cash', label: 'Efectivo', icon: Clock }, { value: 'mercado_pago', label: 'Mercado Pago', icon: CreditCard }] as const).map(({ value, label, icon: Icon }) => <Button key={value} type="button" variant={paymentMethod === value ? 'default' : 'outline'} className="h-auto py-3" onClick={() => setPaymentMethod(value)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}
            </div><p className="text-xs text-muted-foreground">El complejo te contactará para coordinar el método seleccionado.</p></div>
            <div className="space-y-2"><Label htmlFor="booking-notes">Notas (opcional)</Label><Textarea id="booking-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} placeholder="Por ejemplo, una consulta para el complejo" /></div>
          </section>
        )}

        <div className="flex gap-3 pt-2">
          {step > 1 ? <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)} disabled={submitting}><ChevronLeft className="mr-1 h-4 w-4" /> Atrás</Button> : <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>}
          {step < 3 ? <Button type="button" className="ml-auto" onClick={() => setStep((current) => current + 1)} disabled={!canContinue(step)}>Continuar</Button> : <Button type="button" className="ml-auto" onClick={submitReservation} disabled={submitting}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirmando…</> : <><CalendarIcon className="mr-2 h-4 w-4" />Confirmar solicitud</>}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
