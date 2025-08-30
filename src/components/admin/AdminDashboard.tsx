import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalComplexes: number;
  pendingApproval: number;
  approvedComplexes: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  totalUsers: number;
  totalReservations: number;
  monthlyReservations: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalComplexes: 0,
    pendingApproval: 0,
    approvedComplexes: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    expiredSubscriptions: 0,
    totalUsers: 0,
    totalReservations: 0,
    monthlyReservations: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await  (supabase.rpc as any)("admin_get_dashboard_stats");
      if (error) throw error;
  
      const s = data as any;
      setStats({
        totalComplexes: s.totalComplexes ?? 0,
        pendingApproval: s.pendingApproval ?? 0,
        approvedComplexes: s.approvedComplexes ?? 0,
        activeSubscriptions: s.activeSubscriptions ?? 0,
        trialSubscriptions: s.trialSubscriptions ?? 0,
        expiredSubscriptions: s.expiredSubscriptions ?? 0,
        totalUsers: s.totalUsers ?? 0,
        totalReservations: s.totalReservations ?? 0,
        monthlyReservations: s.monthlyReservations ?? 0,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Complexes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Complejos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComplexes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedComplexes} aprobados, {stats.pendingApproval} pendientes
            </p>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios registrados en la plataforma
            </p>
          </CardContent>
        </Card>

        {/* Monthly Reservations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas del Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyReservations}</div>
            <p className="text-xs text-muted-foreground">
              Total: {stats.totalReservations} reservas
            </p>
          </CardContent>
        </Card>

        {/* Revenue Indicator */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividad</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((stats.monthlyReservations / Math.max(stats.totalReservations, 1)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Actividad mensual vs total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.activeSubscriptions}</div>
            <p className="text-xs text-green-600">
              Complejos con suscripción pagada activa
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Períodos de Prueba</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.trialSubscriptions}</div>
            <p className="text-xs text-blue-600">
              Complejos en período de prueba (15 días)
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.expiredSubscriptions}</div>
            <p className="text-xs text-red-600">
              Requieren renovación o reactivación
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Acciones Rápidas</span>
          </CardTitle>
          <CardDescription>
            Acciones comunes de administración
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Aprobaciones Pendientes</h4>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.pendingApproval}</span>
                {stats.pendingApproval > 0 ? (
                  <Badge variant="destructive">Atención</Badge>
                ) : (
                  <Badge variant="secondary">Al día</Badge>
                )}
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Complejos Activos</h4>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.approvedComplexes}</span>
                <Badge variant="default">Operativos</Badge>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Vencimientos Próximos</h4>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.trialSubscriptions}</span>
                <Badge variant="secondary">Monitorear</Badge>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Reactivaciones Necesarias</h4>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.expiredSubscriptions}</span>
                <Badge variant="outline">Contactar</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;