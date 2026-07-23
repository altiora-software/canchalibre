import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Calendar, dateFnsLocalizer, Event, Views } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { es } from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Reservation = {
  id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  payment_status?: string;
  total_price?: number;
  court_name?: string;
  complex_name?: string;
  full_name?: string;
  sport_courts?: { name?: string; sport?: string };
  sport_complexes?: { name?: string };
  profiles?: { full_name?: string };
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { es },
});

const statusLabel = (status?: string) => {
  if (status === "paid") return "Pagada";
  if (status === "approved" || status === "confirmed") return "Confirmada";
  if (status === "cancelled") return "Cancelada";
  return "Pendiente";
};

interface Props {
  reservations: Reservation[];
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  resLoading: boolean;
}

/** Agenda de lectura: cambiar un turno requiere un flujo validado por servidor. */
export default function ReservationsCalendar({ reservations, resLoading }: Props) {
  const [selected, setSelected] = useState<Reservation | null>(null);
  const events = useMemo<Event[]>(() => reservations.map((reservation) => ({
    title: `${reservation.court_name ?? reservation.sport_courts?.name ?? "Cancha"} · ${reservation.full_name ?? reservation.profiles?.full_name ?? "Reserva"}`,
    start: new Date(`${reservation.reservation_date}T${reservation.start_time}`),
    end: new Date(`${reservation.reservation_date}T${reservation.end_time}`),
    resource: reservation,
  })), [reservations]);

  return <Card>
    <CardHeader>
      <CardTitle>Agenda</CardTitle>
      <CardDescription>Consultá los turnos por día, semana o mes. Para modificar un turno, coordiná una nueva reserva.</CardDescription>
    </CardHeader>
    <CardContent>
      {resLoading ? <p className="py-12 text-center text-sm text-muted-foreground">Cargando agenda…</p> : events.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Todavía no hay turnos registrados.</p> : <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        defaultView={Views.WEEK}
        culture="es"
        style={{ height: 640 }}
        messages={{ today: "Hoy", previous: "Anterior", next: "Siguiente", month: "Mes", week: "Semana", day: "Día", agenda: "Lista", noEventsInRange: "No hay turnos en este rango." }}
        onSelectEvent={(event) => setSelected(event.resource as Reservation)}
        eventPropGetter={(event) => ({ style: { backgroundColor: event.resource.payment_status === "cancelled" ? "#b91c1c" : "#1d4ed8", color: "#ffffff", borderRadius: 6 } })}
      />}
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Detalle del turno">
        <Card className="w-full max-w-md">
          <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{selected.court_name ?? selected.sport_courts?.name ?? "Cancha"}</CardTitle><CardDescription>{selected.complex_name ?? selected.sport_complexes?.name}</CardDescription></div><Badge className={selected.payment_status === "cancelled" ? "border-red-800 bg-red-800 text-white dark:border-red-700 dark:bg-red-700" : "border-blue-800 bg-blue-800 text-white dark:border-blue-700 dark:bg-blue-700"}>{statusLabel(selected.payment_status)}</Badge></div></CardHeader>
          <CardContent className="space-y-3 text-sm"><p><strong>Cliente:</strong> {selected.full_name ?? selected.profiles?.full_name ?? "No informado"}</p><p><strong>Horario:</strong> {selected.reservation_date} · {selected.start_time.slice(0, 5)}–{selected.end_time.slice(0, 5)}</p>{typeof selected.total_price === "number" && <p><strong>Total:</strong> {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(selected.total_price)}</p>}<p className="text-muted-foreground">Los cambios de horario y estado no se realizan desde esta agenda.</p><Button variant="outline" className="w-full" onClick={() => setSelected(null)}>Cerrar</Button></CardContent>
        </Card>
      </div>}
    </CardContent>
  </Card>;
}
