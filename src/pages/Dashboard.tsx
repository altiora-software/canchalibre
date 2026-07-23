import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, LogOut, MapPin, Plus, ReceiptText, Settings2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useComplexes } from "@/hooks/useComplexes";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateReservationModal from "@/components/reservationsSection/CreateReservation";
import OwnerNotifications from "@/components/reservationsSection/OwnerNotifications";
import ReservationsCalendar from "@/components/reservationsSection/ReservationsCalendar";

type OwnerReservation = {
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

const planLabel = (status?: string) => status === "active" ? "Activo" : status === "trial" ? "En prueba" : "Sin plan activo";

export default function OwnerDashboard() {
  const { user, signOut } = useAuth();
  const { profile, isOwner, loading: profileLoading } = useProfile();
  const { complexes, loading: complexesLoading, fetchOwnerComplexes } = useComplexes();
  const navigate = useNavigate();
  const [tab, setTab] = useState("today");
  const [reservations, setReservations] = useState<OwnerReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [createForComplexId, setCreateForComplexId] = useState<string | null>(null);
  const [notificationRefresh, setNotificationRefresh] = useState(0);

  useEffect(() => {
    if (!profileLoading && !user) navigate("/auth");
    if (!profileLoading && user && !isOwner) navigate("/");
  }, [isOwner, navigate, profileLoading, user]);

  useEffect(() => {
    if (isOwner && user?.id) void fetchOwnerComplexes(user.id);
    // The hook exposes a non-memoized fetcher; owner identity is the actual data boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, user?.id]);

  const loadReservations = async () => {
    if (!user) return;
    setReservationsLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_reservations_by_owner", { owner_uuid: profile?.id ?? user.id });
    setReservations(error ? [] : (data ?? []) as OwnerReservation[]);
    setReservationsLoading(false);
  };

  useEffect(() => { if (isOwner) void loadReservations(); }, [isOwner]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => reservations.filter((reservation) => reservation.reservation_date >= today && reservation.payment_status !== "cancelled").sort((a, b) => `${a.reservation_date}${a.start_time}`.localeCompare(`${b.reservation_date}${b.start_time}`)), [reservations, today]);
  const courtsCount = complexes.reduce((sum, complex) => sum + (complex.courts?.length ?? 0), 0);
  const planStatus = complexes.some((complex) => complex.payment_status === "active") ? "active" : complexes.some((complex) => complex.payment_status === "trial") ? "trial" : undefined;
  const primaryComplexId = complexes[0]?.id ?? null;

  if (profileLoading || complexesLoading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Cargando tu espacio de trabajo…</div>;
  if (!user || !isOwner) return null;

  const refreshOperationalData = () => {
    setNotificationRefresh((value) => value + 1);
    void loadReservations();
  };

  return <div className="min-h-screen bg-muted/20">
    <Helmet><title>Operación | Cancha Libre</title><meta name="description" content="Agenda, complejos y turnos de propietario" /></Helmet>
    <header className="border-b bg-background"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">Operación</p><h1 className="text-2xl font-bold">Hola, {profile?.full_name?.split(" ")[0] || "propietario"}</h1></div><div className="flex flex-wrap gap-2"><Button className="bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600" onClick={() => setCreateForComplexId(primaryComplexId)} disabled={!primaryComplexId}><Plus className="mr-2 h-4 w-4" />Nueva reserva</Button><Button asChild variant="outline"><Link to="/register-complex"><Plus className="mr-2 h-4 w-4" />Complejo</Link></Button><Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={async () => { await signOut(); navigate("/"); }}><LogOut className="h-4 w-4" /></Button></div></div></header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Tabs value={tab} onValueChange={setTab} className="space-y-6"><TabsList className="grid w-full grid-cols-3 sm:w-auto"><TabsTrigger value="today"><Clock3 className="mr-2 h-4 w-4" />Hoy</TabsTrigger><TabsTrigger value="agenda"><CalendarDays className="mr-2 h-4 w-4" />Agenda</TabsTrigger><TabsTrigger value="complexes"><Settings2 className="mr-2 h-4 w-4" />Complejos</TabsTrigger></TabsList>
      <TabsContent value="today" className="space-y-6"><section className="grid gap-4 md:grid-cols-4"><Metric label="Turnos próximos" value={upcoming.length} icon={<CalendarDays className="h-5 w-5" />} /><Metric label="Pendientes" value={upcoming.filter((reservation) => reservation.payment_status === "pending").length} icon={<Clock3 className="h-5 w-5" />} /><Metric label="Canchas" value={courtsCount} icon={<ReceiptText className="h-5 w-5" />} /><Metric label="Plan" value={planLabel(planStatus)} icon={<CheckCircle2 className="h-5 w-5" />} /></section><section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]"><Card><CardHeader><CardTitle>Próximos turnos</CardTitle><CardDescription>La agenda prioriza lo que sigue, no métricas decorativas.</CardDescription></CardHeader><CardContent className="space-y-3">{reservationsLoading ? <p className="text-sm text-muted-foreground">Actualizando agenda…</p> : upcoming.slice(0, 5).map((reservation) => <div key={reservation.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="font-medium">{reservation.court_name ?? reservation.sport_courts?.name ?? "Cancha"}</p><p className="truncate text-sm text-muted-foreground">{reservation.full_name ?? reservation.profiles?.full_name ?? "Cliente"} · {reservation.reservation_date} · {reservation.start_time.slice(0, 5)}</p></div><Badge variant={reservation.payment_status === "pending" ? "secondary" : "outline"}>{reservation.payment_status === "pending" ? "Pendiente" : "Confirmada"}</Badge></div>)}{!reservationsLoading && upcoming.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No tenés turnos próximos. Podés registrar uno manualmente.</p>}<Button variant="outline" className="w-full" onClick={() => setTab("agenda")}>Ver agenda completa</Button></CardContent></Card><OwnerNotifications refreshKey={notificationRefresh} /></section></TabsContent>
      <TabsContent value="agenda"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Agenda por cancha</h2><p className="text-sm text-muted-foreground">Los turnos se consultan aquí; las modificaciones requieren una operación validada.</p></div><Button variant="outline" onClick={() => void loadReservations()}>Actualizar</Button></div><ReservationsCalendar reservations={reservations} setReservations={setReservations} resLoading={reservationsLoading} /></TabsContent>
      <TabsContent value="complexes"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Tus complejos</h2><p className="text-sm text-muted-foreground">Configuración, canchas y publicación de cada sede.</p></div><Button asChild><Link to="/register-complex"><Plus className="mr-2 h-4 w-4" />Nuevo complejo</Link></Button></div><div className="grid gap-4 md:grid-cols-2">{complexes.map((complex) => <Card key={complex.id}><CardHeader><div className="flex justify-between gap-3"><div><CardTitle>{complex.name}</CardTitle><CardDescription className="mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{complex.neighborhood || complex.address}</CardDescription></div><Badge variant={complex.is_active ? "default" : "secondary"}>{complex.is_active ? "Publicado" : "No publicado"}</Badge></div></CardHeader><CardContent className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{complex.courts?.length ?? 0} canchas · {planLabel(complex.payment_status)}</span><Button asChild variant="outline" size="sm"><Link to={`/owner-complex/${complex.id}`}>Gestionar</Link></Button></CardContent></Card>)}{complexes.length === 0 && <Card className="md:col-span-2"><CardContent className="py-12 text-center"><p className="font-medium">Todavía no registraste un complejo.</p><Button asChild className="mt-4"><Link to="/register-complex">Registrar complejo</Link></Button></CardContent></Card>}</div></TabsContent>
    </Tabs></main>{createForComplexId && <CreateReservationModal isOpen onClose={() => setCreateForComplexId(null)} complexId={createForComplexId} onCreated={refreshOperationalData} />}</div>;
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) { return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div><span className="text-emerald-800 dark:text-emerald-300">{icon}</span></CardContent></Card>; }
