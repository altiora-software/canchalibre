import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, dateFnsLocalizer, Event, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

interface OwnerReservation {
    id: string;
    user_id: string;
    complex_id: string;
    court_id: string;
    reservation_date: string;           // YYYY-MM-DD
    start_time: string;                 // HH:mm
    end_time: string;                   // HH:mm
    total_price?: number;
    payment_status: "pending" | "confirmed" | "cancelled" | "paid";
    sport_complexes?: { 
      id: string; 
      name: string; 
      owner_id: string; 
    };
    sport_courts?: { 
      name: string; 
      sport: string; 
    };
    profiles?: { full_name: string }
  }
  

const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

interface Props {
  reservations: any;
  setReservations: (res: any) => void;
  resLoading: boolean;
}

export default function ReservationsCalendar({ reservations, setReservations, resLoading }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    console.log('reservations dentro del componenete', reservations);
  const events: Event[] = reservations.map((r) => {
    console.log("Res mapeada", r);
  return {
    title: `${r.court_name} · (${r.full_name})`,
    start: new Date(`${r.reservation_date}T${r.start_time}`),
    end: new Date(`${r.reservation_date}T${r.end_time}`),
    resource: {
      ...r,
      sport_complexes: { name: r.complex_name },
      sport_courts: { name: r.court_name, sport: r.sport },
      profiles: { full_name: r.full_name },
    },
  };
});

  console.log('events',events)

  const moveEvent = async ({ event, start, end }: { event: Event; start: Date; end: Date }) => {
    try {
      const newDate = start.toISOString().split("T")[0];
      const newStartTime = start.toTimeString().slice(0, 5);
      const newEndTime = end.toTimeString().slice(0, 5);

      const { error } = await supabase
        .from("reservations")
        .update({ reservation_date: newDate, start_time: newStartTime, end_time: newEndTime })
        .eq("id", event.resource.id);

      if (error) throw error;

      setReservations((prev: any) =>
        prev.map((r: any) =>
          r.id === event.resource.id ? { ...r, reservation_date: newDate, start_time: newStartTime, end_time: newEndTime } : r
        )
      );
    } catch (err) {
      console.error("Error moviendo reserva:", err);
    }
  };

  const formats = {
    dayFormat: (date: Date, culture?: string, localizer?: any) =>
      format(date, 'EEEE', { locale: es }), // día completo, ej. "martes"
    weekdayFormat: (date: Date) => format(date, 'EEEE', { locale: es }),
    dayHeaderFormat: (date: Date) => format(date, 'EEEE dd', { locale: es }),
    dayRangeHeaderFormat: ({ start, end }: any) =>
      `${format(start, 'dd MMMM yyyy', { locale: es })} – ${format(end, 'dd MMMM yyyy', { locale: es })}`,
    monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: es }),
    dayAgendaHeaderFormat: (date: Date) => format(date, 'EEEE dd', { locale: es }),
  };  

  const messages = {
    allDay: "Todo el día",
    previous: "Anterior",
    next: "Siguiente",
    today: "Hoy",
    month: "Mes",
    week: "Semana",
    day: "Día",
    agenda: "Agenda",
    date: "Fecha",
    time: "Hora",
    event: "Evento",
    noEventsInRange: "No hay eventos en este rango.",
    showMore: (count: number) => `+ Ver ${count} más`,
  };

  const updateReservationStatus = async (id: string, newStatus: OwnerReservation["payment_status"]) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ payment_status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, payment_status: newStatus } : r)));
      setSelectedEvent(null);
    } catch (err) {
      console.error("Error actualizando reserva:", err);
    }
  };

  return (
    <section className="px-2 sm:px-4 md:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reservas</CardTitle>
          <CardDescription>Calendario mensual</CardDescription>
        </CardHeader>
        <CardContent className="w-full overflow-x-auto">
          {resLoading ? (
            <div className="py-10 text-center">Cargando reservas…</div>
          ) : reservations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Aún no hay reservas</div>
          ) : (
            <DnDCalendar
              localizer={localizer}
              events={events}
              formats={formats}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600, minWidth: "100%" }}
              views={[Views.MONTH, Views.WEEK, Views.DAY]}
              messages= {messages}
              onSelectEvent={(event) => setSelectedEvent(event.resource)}
              onEventDrop={moveEvent}
              resizable
              onEventResize={moveEvent}
              eventPropGetter={(event) => {
                const status = event.resource.payment_status;
                let backgroundColor = "#93C5FD"; // pendiente azul
                if (status === "confirmed") backgroundColor = "#34D399"; // verde
                if (status === "cancelled") backgroundColor = "#F87171"; // rojo
                return { style: { backgroundColor, color: "white", borderRadius: 6, padding: "2px" } };
              }}
            />
          )}

        {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-md mx-2">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 w-full">
                <div>
                    <CardTitle className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-semibold">
                        {selectedEvent.sport_complexes?.name}
                    </span>
                    <span className="text-sm text-muted-foreground">· {selectedEvent.sport_courts?.name}</span>
                    </CardTitle>
                    <CardDescription className="text-sm">
                    <span className="block">{selectedEvent.profiles?.full_name}</span>
                    <span className="block">
                        {selectedEvent.reservation_date.split("-").reverse().join("/")} ·{" "}
                        {selectedEvent.start_time.slice(0,5)} – {selectedEvent.end_time.slice(0,5)}
                    </span>
                    </CardDescription>
                </div>

                <div className="flex items-start gap-2">
                    {/* Estado */}
                    <Badge className="uppercase px-2 py-1 text-xs">
                    {selectedEvent.payment_status}
                    </Badge>
                </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <div className="text-xs text-muted-foreground">Deporte</div>
                    <div className="font-medium">{selectedEvent.sport || selectedEvent.sport_courts?.sport}</div>
                </div>

                <div>
                    <div className="text-xs text-muted-foreground">Método de pago</div>
                    <div className="font-medium capitalize">
                    {selectedEvent.payment_method === "mercado_pago" ? "Mercado Pago" : selectedEvent.payment_method}
                    </div>
                </div>

                <div>
                    <div className="text-xs text-muted-foreground">Precio total</div>
                    <div className="font-medium">
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(selectedEvent.total_price ?? 0)}
                    </div>
                </div>

                <div>
                    <div className="text-xs text-muted-foreground">Depósito</div>
                    <div className="font-medium">
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(selectedEvent.deposit_amount ?? 0)}
                    {selectedEvent.deposit_paid ? <span className="ml-2 text-sm text-green-500">(Pagado)</span> : <span className="ml-2 text-sm text-yellow-400">(No pagado)</span>}
                    </div>
                </div>
                </div>

                {/* IDs, notas y timestamps */}
                <div className="space-y-2 text-sm">
                {selectedEvent.mercadopago_payment_id && (
                    <div>
                    <div className="text-xs text-muted-foreground">MP Payment ID</div>
                    <div className="break-words flex items-center gap-2">
                        <span className="font-mono text-sm">{selectedEvent.mercadopago_payment_id}</span>
                        <button
                        className="text-xs underline"
                        onClick={() => navigator.clipboard?.writeText(selectedEvent.mercadopago_payment_id || "")}
                        >
                        Copiar
                        </button>
                    </div>
                    </div>
                )}

                {selectedEvent.notes && (
                    <div>
                    <div className="text-xs text-muted-foreground">Notas</div>
                    <div className="whitespace-pre-wrap">{selectedEvent.notes}</div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                    <div>Creado</div>
                    <div className="font-mono text-[13px]">
                        {new Date(selectedEvent.created_at).toLocaleString("es-AR")}
                    </div>
                    </div>
                    <div>
                    <div>Actualizado</div>
                    <div className="font-mono text-[13px]">
                        {new Date(selectedEvent.updated_at).toLocaleString("es-AR")}
                    </div>
                    </div>
                </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                {selectedEvent.payment_status !== "confirmed" && (
                    <Button onClick={() => updateReservationStatus(selectedEvent.reservation_id, "confirmed")}>
                    Aprobar
                    </Button>
                )}
                {selectedEvent.payment_status !== "cancelled" && (
                    <Button variant="destructive" onClick={() => updateReservationStatus(selectedEvent.reservation_id, "cancelled")}>
                    Cancelar
                    </Button>
                )}
                {selectedEvent.payment_status !== "pending" && (
                    <Button variant="secondary" onClick={() => updateReservationStatus(selectedEvent.reservation_id, "pending")}>
                    Poner pendiente
                    </Button>
                )}

                <Button variant="ghost" onClick={() => setSelectedEvent(null)}>
                    Cerrar
                </Button>
                </div>
            </CardContent>
            </Card>
        </div>
        )}

        </CardContent>
      </Card>
    </section>
  );
}
