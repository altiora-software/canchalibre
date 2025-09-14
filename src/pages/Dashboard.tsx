import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useComplexes } from "@/hooks/useComplexes";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  BarChart3, Calendar, CheckCircle2, Clock, Eye, MapPin, Megaphone,
  Plus, Settings, ShieldAlert, Sparkles, Users
} from "lucide-react";

type OwnerReservation = {
  id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_price: number | null;
  payment_status: string | null;
  sport_courts?: { name: string; sport: string } | null;
  sport_complexes?: { id: string; name: string } | null;
};

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { isOwner, loading: profileLoading } = useProfile();
  const { complexes, loading: complexesLoading, fetchOwnerComplexes } = useComplexes();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"dashboard" | "reservations" | "notifications" | "plus">("dashboard");
  const [resLoading, setResLoading] = useState(false);
  const [reservations, setReservations] = useState<OwnerReservation[]>([]);

  useEffect(() => {
    if (user && isOwner) fetchOwnerComplexes(user.id);
  }, [user, isOwner]);

  const { anyActive, anyTrial, courtsCount } = useMemo(() => {
    const pay = complexes?.map(c => c.payment_status) ?? [];
    const courts = complexes.reduce((acc: number, c: any) => acc + (c.courts?.length || 0), 0);
    return {
      anyActive: pay.some(p => p === "active"),
      anyTrial:  pay.some(p => p === "trial"),
      courtsCount: courts
    };
  }, [complexes]);

  const loadReservations = async () => {
    if (!user) return;
    setResLoading(true);
    try {
      // intento 1: join directo (si RLS lo permite)
      let { data, error } = await supabase
        .from("reservations")
        .select(`
          id,reservation_date,start_time,end_time,total_price,payment_status,
          sport_courts ( name, sport ),
          sport_complexes!inner ( id, name, owner_id )
        `)
        .eq("sport_complexes.owner_id", user.id)
        .order("reservation_date", { ascending: false })
        .order("start_time", { ascending: true });

      if (!error && Array.isArray(data)) {
        setReservations(data as unknown as OwnerReservation[]);
        return;
      }

      // intento 2: dos pasos por RLS
      const complexIds = complexes.map(c => c.id);
      if (complexIds.length === 0) {
        setReservations([]);
        return;
      }
      const step2 = await supabase
        .from("reservations")
      .select(`
        id,
        reservation_date,
        start_time,
        end_time,
        total_price,
        payment_status,

        sport_complexes:complex_id!inner(reservations_complex_id_fkey) (
          id, name, owner_id
        ),

        sport_courts:court_id!reservations_court_id_fkey (
          name, sport
        )
      `)
      .eq("sport_complexes.owner_id", user.id)   // filtro sobre la tabla join
      .order("reservation_date", { ascending: false })
      .order("start_time", { ascending: true });

      if (!step2.error && Array.isArray(step2.data)) {
        setReservations(step2.data as unknown as OwnerReservation[]);
      }
    } finally {
      setResLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "reservations" && reservations.length === 0 && !resLoading) loadReservations();
  }, [tab]);

  if (!user) { navigate("/auth"); return null; }
  if (profileLoading || complexesLoading) return <div className="min-h-screen flex items-center justify-center">Cargando…</div>;
  if (!isOwner) { navigate("/"); return null; }

  return (
    <>
      <Helmet>
        <title>Panel de Dueño | Cancha Libre</title>
        <meta name="description" content="Administra tus complejos, reservas y comunicación" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header + Nav (mobile-first) */}
        <div className="border-b bg-white sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold">Panel de Dueño</h1>
              <p className="text-muted-foreground">Gestiona tus complejos, reservas y comunicación</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/register-complex"><Plus className="w-4 h-4 mr-2" />Nuevo Complejo</Link>
              </Button>
              <Button asChild className="bg-gradient-sport w-full sm:w-auto">
                <Link to="/">Ir al sitio</Link>
              </Button>
            </div>
          </div>

          <div className="container mx-auto px-4 pb-3">
            <Tabs value={tab} onValueChange={(v:any)=>setTab(v)} className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="dashboard" className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Dashboard</TabsTrigger>
                <TabsTrigger value="reservations" className="flex items-center gap-2"><Calendar className="w-4 h-4" />Reservas</TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2"><Megaphone className="w-4 h-4" />Notificaciones</TabsTrigger>
                <TabsTrigger value="plus" className="flex items-center gap-2"><Sparkles className="w-4 h-4" />Plus</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <main className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <section className="space-y-6">
              {!anyActive && (
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Estás en período de prueba</AlertTitle>
                  <AlertDescription>Algunas funciones avanzadas estarán limitadas. Activa tu plan para habilitar Acciones Plus y reportes completos.</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">Complejos</p><p className="text-xl sm:text-2xl font-bold">{complexes.length}</p></div><MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /></div></CardContent></Card>
                <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">Canchas</p><p className="text-xl sm:text-2xl font-bold">{courtsCount}</p></div><Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /></div></CardContent></Card>
                <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">Reservas (7d)</p><p className="text-xl sm:text-2xl font-bold">{reservations.filter(r => Date.now() - new Date(r.reservation_date).getTime() <= 7*24*3600*1000).length}</p></div><Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" /></div></CardContent></Card>
                <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">Estado del plan</p><p className="text-xl sm:text-2xl font-bold">{anyActive ? "Activo" : anyTrial ? "Prueba" : "Inactivo"}</p></div><CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" /></div></CardContent></Card>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-semibold">Mis Complejos</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {complexes.map((c) => (
                    <Card key={c.id} className="hover:shadow-card-hover transition-all">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base sm:text-lg">{c.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                              <MapPin className="w-4 h-4" /> {c.address}
                            </CardDescription>
                          </div>
                          <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Activo" : "Inactivo"}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm gap-3">
                          <div className="flex items-center"><Users className="w-4 h-4 mr-2 text-muted-foreground" />{c.courts?.length || 0} canchas</div>
                          <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-muted-foreground" />{c.payment_status === "trial" ? "Prueba" : c.payment_status === "active" ? "Plan activo" : "Plan inactivo"}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/complex/${c.id}`)} className="w-full"><Eye className="w-4 h-4 mr-2" />Ver</Button>
                          <Button size="sm" variant="outline" className="w-full"><Settings className="w-4 h-4 mr-2" />Editar</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* RESERVAS */}
          {tab === "reservations" && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Reservas</CardTitle>
                  <CardDescription>Listado de reservas en tus complejos</CardDescription>
                </CardHeader>
                <CardContent>
                  {resLoading ? (
                    <div className="py-10 text-center">Cargando reservas…</div>
                  ) : reservations.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">Aún no hay reservas</div>
                  ) : (
                    <>
                      {/* Mobile list */}
                      <div className="sm:hidden space-y-3">
                        {reservations.map(r => (
                          <Card key={r.id}>
                            <CardContent className="p-4 space-y-1">
                              <div className="flex justify-between">
                                <span className="font-medium">{new Date(r.reservation_date).toLocaleDateString("es-AR")}</span>
                                <span className="text-xs text-muted-foreground">{r.start_time.slice(0,5)} – {r.end_time.slice(0,5)}</span>
                              </div>
                              <div className="text-sm">{r.sport_complexes?.name} · {r.sport_courts?.name}</div>
                              <div className="flex justify-between items-center text-sm">
                                <span>{r.sport_courts?.sport || "-"}</span>
                                <span className="flex items-center gap-2">
                                  {r.total_price ? `$${r.total_price}` : "-"}
                                  <Badge variant={r.payment_status === "paid" ? "default" : "secondary"}>
                                    {r.payment_status || "pendiente"}
                                  </Badge>
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop table */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Horario</TableHead>
                              <TableHead>Complejo</TableHead>
                              <TableHead>Cancha</TableHead>
                              <TableHead>Deporte</TableHead>
                              <TableHead>Importe</TableHead>
                              <TableHead>Pago</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reservations.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell>{new Date(r.reservation_date).toLocaleDateString("es-AR")}</TableCell>
                                <TableCell>{r.start_time.slice(0,5)} – {r.end_time.slice(0,5)}</TableCell>
                                <TableCell>{r.sport_complexes?.name}</TableCell>
                                <TableCell>{r.sport_courts?.name}</TableCell>
                                <TableCell>{r.sport_courts?.sport}</TableCell>
                                <TableCell>{r.total_price ? `$${r.total_price}` : "-"}</TableCell>
                                <TableCell>
                                  <Badge variant={r.payment_status === "paid" ? "default" : "secondary"}>
                                    {r.payment_status || "pendiente"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* NOTIFICACIONES */}
          {tab === "notifications" && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Automáticas</CardTitle>
                  <CardDescription>Mensajes al crear/cancelar reservas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Activa notificaciones por WhatsApp o Email cuando se realiza una nueva reserva.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button disabled variant="outline" className="w-full">Configurar WhatsApp</Button>
                    <Button disabled variant="outline" className="w-full">Configurar Email</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">*Próximamente en Acciones Plus.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manual</CardTitle>
                  <CardDescription>Envía comunicados a tus clientes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button disabled className="w-full">Enviar promoción</Button>
                  <Button disabled variant="secondary" className="w-full">Anunciar evento</Button>
                  <p className="text-xs text-muted-foreground">*Disponible con plan activo.</p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* PLUS */}
          {tab === "plus" && (
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {[
                { title: "Bloqueo de horarios recurrentes", desc: "Cierra horarios por mantenimiento o torneos." },
                { title: "Precios dinámicos", desc: "Ajusta el precio por hora según demanda." },
                { title: "Reportes avanzados", desc: "Ingresos, ocupación y comparativas." },
              ].map((f, i) => (
                <Card key={i} className={!anyActive ? "opacity-70" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4" />{f.title}</CardTitle>
                    <CardDescription>{f.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Badge variant={anyActive ? "default" : "secondary"}>{anyActive ? "Disponible" : "Bloqueado (trial)"}</Badge>
                    <Button disabled={!anyActive}>Usar</Button>
                  </CardContent>
                </Card>
              ))}

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Activa el plan para desbloquear todo</CardTitle>
                  <CardDescription>Durante la prueba gratis, algunas funciones estarán limitadas.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button disabled={anyActive} className="bg-gradient-sport">Activar plan</Button>
                  <Button variant="outline">Ver beneficios</Button>
                </CardContent>
              </Card>
            </section>
          )}
        </main>
      </div>
    </>
  );
};

export default OwnerDashboard;
