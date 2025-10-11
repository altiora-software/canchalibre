import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, BarChart3, Calendar, Megaphone, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export default function OwnerHeader({ tab, setTab, setIsCreateModalOpen }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="border-b bg-white sticky top-0 z-40">
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
                    onClick={handleLogout}
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
        <Tabs value={tab} onValueChange={(v) => setTab(v)} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />Dashboard
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />Reservas
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />Notificaciones
            </TabsTrigger>
            <TabsTrigger value="plus" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />Plus
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
