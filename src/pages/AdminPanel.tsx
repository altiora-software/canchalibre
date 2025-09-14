import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, CreditCard, Bell, BarChart3, LogOut } from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import AdminComplexApproval from "@/components/admin/AdminComplexApproval";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminNotifications from "@/components/admin/AdminNotifications";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client"; // <- usa tu cliente existente

const formatCurrencyARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

const AdminPanel = () => {
  const { isAuthenticated, loading, logout } = useSuperAdmin();
  const navigate = useNavigate();

  // ====== NUEVO: estado para métricas ======
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const [totalComplexes, setTotalComplexes] = useState(0);
  const [approvedComplexes, setApprovedComplexes] = useState(0);
  const [pendingComplexes, setPendingComplexes] = useState(0);
  const [activeComplexes, setActiveComplexes] = useState(0);

  const [totalCourts, setTotalCourts] = useState(0);
  const [totalReservations, setTotalReservations] = useState(0);
  const [reservations30d, setReservations30d] = useState(0);

  const [revenueAll, setRevenueAll] = useState(0);
  const [revenue30d, setRevenue30d] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/superadmin");
    }
  }, [isAuthenticated, loading, navigate]);

  // ====== NUEVO: carga de métricas (solo cuando hay sesión) ======
  useEffect(() => {
    if (loading || !isAuthenticated) return;

    let cancelled = false;
    const daysAgoISO = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    async function loadDashboard() {
      setDashLoading(true);
      setDashError(null);
      try {
        const last30 = daysAgoISO(30);

        const [
          complexesAll,
          complexesApproved,
          complexesPendingRes,
          complexesActive,
          courtsAll,
          reservationsAll,
          reservationsLast30,
          paymentsAllPaid,
          paymentsLast30Paid,
        ] = await Promise.all([
          supabase.from("sport_complexes").select("id"),
          supabase.from("sport_complexes").select("id").eq("is_approved", true),
          supabase.from("sport_complexes").select("id").eq("is_approved", false),
          supabase.from("sport_complexes").select("id").eq("is_active", true),

          supabase.from("sport_courts").select("id"),

          supabase.from("reservations").select("id"),
          supabase.from("reservations").select("id").gte("created_at", last30),

          supabase.from("payment_transactions").select("amount,status").eq("status", "paid"),
          supabase.from("payment_transactions").select("amount,status,payment_date").eq("status", "paid").gte("payment_date", last30),
        ]);

        const throwIf = (r: any) => { if (r.error) throw r.error; return r.data ?? []; };

        if (cancelled) return;

        setTotalComplexes(throwIf(complexesAll).length);
        setApprovedComplexes(throwIf(complexesApproved).length);
        setPendingComplexes(throwIf(complexesPendingRes).length);
        setActiveComplexes(throwIf(complexesActive).length);

        setTotalCourts(throwIf(courtsAll).length);

        setTotalReservations(throwIf(reservationsAll).length);
        setReservations30d(throwIf(reservationsLast30).length);

        const sumAll = throwIf(paymentsAllPaid).reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
        const sum30 = throwIf(paymentsLast30Paid).reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
        setRevenueAll(sumAll);
        setRevenue30d(sum30);
      } catch (e: any) {
        setDashError(e?.message ?? "Error cargando métricas");
        console.error(e);
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/superadmin");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Panel Administrativo - Cancha Libre</title>
        <meta name="description" content="Panel de administración para gestionar complejos deportivos, suscripciones y notificaciones" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Panel Administrativo</h1>
              <p className="text-muted-foreground mt-1">
                Gestión completa de complejos deportivos y suscripciones
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Conectado como</p>
              <p className="font-medium text-foreground">Super Administrador</p>
              <p className="text-xs text-destructive font-semibold uppercase">SUPER ADMIN</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="complexes" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Complejos</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Suscripciones</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notificaciones</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* ====== NUEVO: bloque de métricas (misma estética con Card) ====== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Complejos</CardTitle>
                  <CardDescription>Totales / Aprobados / Pendientes</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashLoading ? (
                    <div className="text-sm text-muted-foreground">Cargando…</div>
                  ) : dashError ? (
                    <div className="text-sm text-destructive">Error: {dashError}</div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-3xl font-bold">{totalComplexes}</div>
                      <div className="text-xs text-muted-foreground">
                        Aprobados: {approvedComplexes} · Pendientes: {pendingComplexes} · Activos: {activeComplexes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Canchas</CardTitle>
                  <CardDescription>Total registradas</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashLoading ? (
                    <div className="text-sm text-muted-foreground">Cargando…</div>
                  ) : dashError ? (
                    <div className="text-sm text-destructive">Error: {dashError}</div>
                  ) : (
                    <div className="text-3xl font-bold">{totalCourts}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Reservas (30 días)</CardTitle>
                  <CardDescription>Total histórico y últimos 30 días</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashLoading ? (
                    <div className="text-sm text-muted-foreground">Cargando…</div>
                  ) : dashError ? (
                    <div className="text-sm text-destructive">Error: {dashError}</div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-3xl font-bold">{reservations30d}</div>
                      <div className="text-xs text-muted-foreground">Histórico: {totalReservations}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Facturación</CardTitle>
                  <CardDescription>Pagos con estado “paid”</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashLoading ? (
                    <div className="text-sm text-muted-foreground">Cargando…</div>
                  ) : dashError ? (
                    <div className="text-sm text-destructive">Error: {dashError}</div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">{formatCurrencyARS(revenue30d)} <span className="text-xs font-normal">30 días</span></div>
                      <div className="text-xs text-muted-foreground">Histórico: {formatCurrencyARS(revenueAll)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tu dashboard existente (gráficos/listados propios) */}
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="complexes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Gestión de Complejos Deportivos</span>
                </CardTitle>
                <CardDescription>
                  Aprueba o rechaza complejos deportivos, gestiona su estado y configuración
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminComplexApproval />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Gestión de Suscripciones</span>
                </CardTitle>
                <CardDescription>
                  Administra suscripciones, períodos de prueba de 15 días y estado de pagos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminSubscriptions />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Centro de Notificaciones</span>
                </CardTitle>
                <CardDescription>
                  Envía notificaciones automáticas y manuales a propietarios de complejos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminNotifications />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
