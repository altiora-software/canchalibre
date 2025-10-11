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
  import CreateReservationModal, { OwnerReservation as ModalOwnerReservation } from "@/components/reservationsSection/CreateReservation";


  import {
    BarChart3, Calendar, CheckCircle2, Clock, Eye, Layers, LogOut, MapPin, Megaphone,
    Plus, Settings, ShieldAlert, Sparkles, User, Users
  } from "lucide-react";
  import ReservationsCalendar from "@/components/reservationsSection/ReservationsCalendar";
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
  import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import OwnerHeader from "@/components/HeaderOwner";

  interface OwnerReservation {
    id: string;
    user_id: string;
    complex_id: string;
    court_id: string;
    reservation_date: string;           // YYYY-MM-DD
    start_time: string;                 // HH:mm
    end_time: string;                   // HH:mm
    total_price?: number;
    payment_status: "pending" | "approved" | "cancelled" | "paid";
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

  const OwnerDashboard = () => {
    const { user, signOut } = useAuth();
    const { isOwner, loading: profileLoading, profile } = useProfile();
    console.log('user',user);
    const { complexes, loading: complexesLoading, fetchOwnerComplexes } = useComplexes(user?.id ?? undefined, isOwner );
    const navigate = useNavigate();
    const [tab, setTab] = useState<"dashboard" | "reservations" | "notifications" | "plus">("dashboard");
    const [resLoading, setResLoading] = useState(false);
    const [reservations, setReservations] = useState<OwnerReservation[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [authReady, setAuthReady] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    interface ReservationWithProfile {
      id: string;
      user_id: string;
      complex_id: string;
      court_id: string;
      reservation_date: string;
      start_time: string;
      end_time: string;
      total_price: number;
      deposit_amount: number;
      deposit_paid: boolean;
      payment_method: string;
      payment_status: string;
      mercadopago_payment_id: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
      sport_complexes: { id: string; name: string; owner_id: string };
      sport_courts: { name: string; sport: string };
      full_name: string; // <- del creador de la reserva
    }

    // Llamamos a fetchOwnerComplexes UNA VEZ cuando tengamos user e isOwner.
    // Usamos profile.id si existe (owner id real), si no usamos user.id como fallback.
    useEffect(() => {
      if (isOwner) {
        const ownerIdToFetch = profile?.id;
        console.log("Fetching owner complexes for id:", ownerIdToFetch);
        // fetchOwnerComplexes(ownerIdToFetch);
        console.log('complexes',complexes);
      } else {
        // si no es owner o no hay user, mantener el estado como vacío para evitar leaks en UI
        // (no forzamos setComplexes aquí porque el hook useComplexes controla su propio estado)
        console.log("No fetchOwnerComplexes: user or isOwner missing", { user: !!user, isOwner });
      }
      console.log("profile", profile);
    }, [isOwner, profile?.id]);

    useEffect(() => {
      // suscripción a cambios de auth; se dispara inmediatamente con el estado actual en v2
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        // cuando se ejecute por primera vez, sabemos que supabase ya consultó el storage
        setAuthReady(true);
        // opcional: si querés puedes loggear session para debug
        // console.log("onAuthStateChange:", _event, session);
      });
    
      // fallback: si getUser responde rápido (en caso que onAuthStateChange no se dispare)
      supabase.auth.getUser().then(() => setAuthReady(true)).catch(() => setAuthReady(true));
    
      return () => {
        subscription?.unsubscribe();
      };
    }, []);

    const { anyActive, anyTrial, courtsCount } = useMemo(() => {
      const cs = complexes ?? [];
      const pay = cs.map((c: any) => c.payment_status) ?? [];
      const courts = cs.reduce((acc: number, c: any) => acc + (c.courts?.length || 0), 0);
      return {
        anyActive: pay.some((p: any) => p === "active"),
        anyTrial:  pay.some((p: any) => p === "trial"),
        courtsCount: courts
      };
    }, [complexes]);

    const loadReservations = async () => {
      if (!user) {
        console.warn("No hay `user` en el contexto. Abortando loadReservations.");
        return;
      }
      setResLoading(true);
    
      try {
        // Obtener user autenticado del cliente (opcional, sólo para logs)
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) console.warn("supabase.auth.getUser() error:", authError);
        const authUserId = authData?.user?.app_metadata?.id ?? user.id;
        const ownerId = profile?.id ?? user.id;
        console.log('ownerId', ownerId);
        console.log('authData',authData);
        console.log("Cargando reservas para owner (authUserId):", authUserId);

        const { data, error } = await supabase
          .rpc<any, any>("get_reservations_by_owner", {
            owner_uuid: ownerId  
          });

        if (error) {
          console.error("Error al obtener reservas:", error);
          setReservations([]);
          return;
        }
    
        console.log("Reservas devueltas por Supabase (post-RLS):", Array.isArray(data) ? data.length : 0);
        console.log("data:", data);
        setReservations((data ?? []) as unknown as OwnerReservation[]);
      } catch (err) {
        console.error("Error inesperado en loadReservations:", err);
        setReservations([]);
      } finally {
        setResLoading(false);
      }
    };

    const handleCreatedReservation = (res: ModalOwnerReservation) => {
      // normalizar la estructura para el estado local
      const normalized: OwnerReservation = {
        id: res.reservation_id ?? (res as any).id,
        user_id: res.user_id,
        complex_id: res.complex_id,
        court_id: res.court_id,
        reservation_date: res.reservation_date,
        start_time: res.start_time,
        end_time: res.end_time,
        total_price: res.total_price ?? 0,
        payment_status: res.payment_status ?? "pending",
        sport_complexes: res.sport_complexes ? { id: res.sport_complexes.id ?? "", name: res.sport_complexes.name ?? "", owner_id: res.sport_complexes.owner_id ?? "" } : undefined,
        sport_courts: res.sport_courts ? { name: res.sport_courts.name ?? "", sport: res.sport_courts.sport ?? "" } : undefined,
        profiles: res.profiles ? { full_name: res.profiles.full_name ?? "" } : undefined,
        };

      setReservations(prev => [normalized, ...(prev ?? [])]);

      // si ya estás en la pestaña reservaciones, podrías refrescar o solo insertar — aquí insertamos
      if (tab !== "reservations") setTab("reservations");
    };
    
    useEffect(() => {
      if (tab === "reservations" ) loadReservations();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]); // mantenemos deps limitadas para evitar reloops

    useEffect(() => {
      if (!authReady) {
        return;
      }
    
      if (!profileLoading && !user) {
        navigate("/auth");
        return;
      }
    
      if (!profileLoading && user && !isOwner) {
        navigate("/");
        return;
      }
    }, [authReady, user, isOwner, profileLoading, navigate]);
    

    const handleSignOut = async () => {
      await signOut();
      setIsMenuOpen(false);
      navigate("/");
    };

    return (
      <>
        <Helmet>
          <title>Panel de Dueño | Cancha Libre</title>
          <meta name="description" content="Administra tus complejos, reservas y comunicación" />
        </Helmet>

        <div className="min-h-screen bg-background">
          {/* Header + Nav (mobile-first) */}
          {/* <OwnerHeader
            tab={tab}
            setTab={setTab}
            setIsCreateModalOpen={setIsCreateModalOpen}
          /> */}
          <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: título */}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight truncate">
              Panel de Dueño
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">
              Gestiona tus complejos, reservas y comunicación
            </p>
          </div>

          {/* Right: botones */}
            <div className="w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full sm:w-auto min-w-0"
                    aria-label="Crear nueva reserva"
                >
                    <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Nueva reserva</span>
                </Button>

                <Button
                    asChild
                    variant="outline"
                    className="w-full sm:w-auto min-w-0"
                    aria-label="Registrar nuevo complejo"
                >
                    <Link to="/register-complex" className="inline-flex items-center">
                    <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Nuevo Complejo</span>
                    </Link>
                </Button>
                {/* 🔹 Botón de cerrar sesión */}
                <Button
                    variant="destructive"
                    className="w-full sm:w-auto min-w-0"
                    onClick={handleSignOut}
                    aria-label="Cerrar sesión"
                >
                    <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Cerrar sesión</span>
                </Button>
                </div>
            </div>
            
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
                  <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">Complejos</p><p className="text-xl sm:text-2xl font-bold">{complexes?.length ?? 0}</p></div><MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /></div></CardContent></Card>
                  <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">Canchas</p><p className="text-xl sm:text-2xl font-bold">{courtsCount}</p></div><Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /></div></CardContent></Card>
                  <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">Reservas (7d)</p><p className="text-xl sm:text-2xl font-bold">{reservations.filter(r => Date.now() - new Date(r.reservation_date).getTime() <= 7*24*3600*1000).length}</p></div><Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" /></div></CardContent></Card>
                  <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">Estado del plan</p><p className="text-xl sm:text-2xl font-bold">{anyActive ? "Activo" : anyTrial ? "Prueba" : "Inactivo"}</p></div><CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" /></div></CardContent></Card>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg sm:text-xl font-semibold">Mis Complejos</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {(complexes ?? []).map((c: any) => (
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
                            <Button size="sm" variant="outline" onClick={() => navigate(`/owner-complex/${c.id}`)} className="w-full"><Eye className="w-4 h-4 mr-2" />Ver</Button>
                            {/* <Button size="sm" variant="outline" className="w-full"><Settings className="w-4 h-4 mr-2" />Editar</Button> */}
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
              <>
                {!anyActive && (
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Estás en período de prueba</AlertTitle>
                    <AlertDescription>Algunas funciones avanzadas estarán limitadas. Activa tu plan para habilitar Acciones Plus y reportes completos.</AlertDescription>
                  </Alert>
                )}
                <ReservationsCalendar
                  reservations={reservations}
                  setReservations={setReservations}
                  resLoading={resLoading}
                  />
              </>
            )}

            {/* NOTIFICACIONES */}
            {tab === "notifications" && (
              <>
                {!anyActive && (
                    <Alert>
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>Estás en período de prueba</AlertTitle>
                      <AlertDescription>Algunas funciones avanzadas estarán limitadas. Activa tu plan para habilitar Acciones Plus y reportes completos.</AlertDescription>
                    </Alert>
                  )}
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
              </>
            )}

            {/* PLUS */}
            {tab === "plus" && (
              <>
                  {!anyActive && (
                    <Alert>
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>Estás en período de prueba</AlertTitle>
                      <AlertDescription>Algunas funciones avanzadas estarán limitadas. Activa tu plan para habilitar Acciones Plus y reportes completos.</AlertDescription>
                    </Alert>
                  )}
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
              </>
            )}
            <CreateReservationModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              authUserId={user?.id ?? ""}
              onCreated={handleCreatedReservation}
            />
          </main>
        </div>
      </>
    );
  };

  export default OwnerDashboard;
