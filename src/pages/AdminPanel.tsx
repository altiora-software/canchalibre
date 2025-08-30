import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Link } from "react-router-dom";

const AdminPanel = () => {
  const { isAuthenticated, loading, logout } = useSuperAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/superadmin");
    }
  }, [isAuthenticated, loading, navigate]);

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
        <title>Panel Administrativo - Canchas Jujuy</title>
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