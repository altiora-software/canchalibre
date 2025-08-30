import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useComplexes } from "@/hooks/useComplexes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Plus, 
  MapPin, 
  Clock, 
  Users, 
  Eye,
  Settings,
  BarChart3,
  Calendar
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { isOwner, loading: profileLoading } = useProfile();
  const { complexes, loading, fetchOwnerComplexes } = useComplexes();
  const navigate = useNavigate();
  
  // Load owner's complexes when user is available
  useEffect(() => {
    if (user && isOwner) {
      fetchOwnerComplexes(user.id);
    }
  }, [user, isOwner]);
  
  const userComplexes = complexes;

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (profileLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!isOwner) {
    navigate('/');
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Mis Complejos | Canchas Jujuy</title>
        <meta name="description" content="Administra tus complejos deportivos registrados en Canchas Jujuy" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-white sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al inicio
                </Button> */}
                <div>
                  <h1 className="text-2xl font-bold">Dashboard</h1>
                  <p className="text-muted-foreground">Administra tus complejos deportivos</p>
                </div>
              </div>
              
              <Button asChild className="bg-gradient-sport">
                <Link to="/register-complex">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Complejo
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Complejos Activos</p>
                    <p className="text-2xl font-bold">{userComplexes.length}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reservas Hoy</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <Calendar className="w-8 h-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Visitas</p>
                    <p className="text-2xl font-bold">248</p>
                  </div>
                  <Eye className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos</p>
                    <p className="text-2xl font-bold">$15,420</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Complexes List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mis Complejos</h2>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p>Cargando complejos...</p>
              </div>
            ) : userComplexes.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="space-y-4">
                  <div className="text-6xl">🏟️</div>
                  <h3 className="text-xl font-semibold">No tienes complejos registrados</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Registra tu primer complejo deportivo para empezar a recibir reservas
                  </p>
                  <Button asChild className="bg-gradient-sport">
                    <Link to="/register-complex">
                      <Plus className="w-4 h-4 mr-2" />
                      Registrar Complejo
                    </Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {userComplexes.map((complex) => (
                  <Card key={complex.id} className="hover:shadow-card-hover transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{complex.name}</CardTitle>
                        <Badge variant={complex.is_active ? "default" : "secondary"}>
                          {complex.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2" />
                        {complex.address}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                          {complex.courts?.length || 0} canchas
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                          Abierto
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => navigate(`/complex/${complex.id}`)}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Settings className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;