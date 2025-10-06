import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, Search, Filter, Menu, X, User, LogOut, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const sports = [
  { id: "todos", name: "Todos", icon: "🏆" },
  { id: "futbol", name: "Fútbol", icon: "⚽" },
  { id: "basquet", name: "Básquet", icon: "🏀" },
  { id: "tenis", name: "Tenis", icon: "🎾" },
  { id: "voley", name: "Vóley", icon: "🏐" },
  { id: "handball", name: "Handball", icon: "🤾" },
  { id: "skate", name: "Skate", icon: "🛹" },
  { id: "padle", name: "Padle", icon: "🎾" },
];

interface HeaderProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const Header = ({ selectedSport, onSportChange, searchTerm, onSearchChange }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isOwner, isAdmin } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-green/95 backdrop-blur-sm border-b border-border shadow-card-custom">
      <div className="container mx-auto px-4">
        {/* Main Header */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-sport rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CL</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Cancha Libre</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">San Salvador de Jujuy</p>
            </div>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md mx-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar canchas, ubicación..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 bg-muted/50 border-0 focus:bg-white focus:shadow-card-hover transition-all"
              />
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-muted-foreground border-border hover:border-primary hover:text-primary"
              onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Ver Mapa
            </Button>
            
            {user ? (
              <>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem disabled>
                      <User className="mr-2 h-4 w-4" />
                      {user.email}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user && (<DropdownMenuItem asChild>
                      <Link to="/my-reservations">
                        <User className="mr-2 h-4 w-4" />
                        Mis Reservas
                      </Link>
                    </DropdownMenuItem>)}
                    {user && (<DropdownMenuItem asChild>
                      <Link to="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </Link>
                    </DropdownMenuItem>)}
                    {isOwner && (
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard">
                          <Settings className="mr-2 h-4 w-4" />
                          Mis Complejos
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          <Settings className="mr-2 h-4 w-4" />
                          Panel Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild size="sm" className="bg-gradient-sport hover:shadow-sport transition-all">
                <Link to="/auth">
                  Iniciar Sesión
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Sports Filter Bar - Always visible on desktop */}
        <div className="hidden md:flex items-center space-x-2 py-3 border-t border-border/50">
          <Filter className="w-4 h-4 text-muted-foreground mr-2" />
          <div className="flex items-center space-x-2 overflow-x-auto">
            {sports.map((sport) => (
              <Badge
                key={sport.id}
                variant={selectedSport === sport.id ? "default" : "outline"}
                className={`cursor-pointer whitespace-nowrap transition-all hover:scale-105 ${
                  selectedSport === sport.id
                    ? "bg-primary text-primary-foreground shadow-sport"
                    : "hover:border-primary hover:text-primary"
                }`}
                onClick={() => onSportChange(sport.id)}
              >
                <span className="mr-1">{sport.icon}</span>
                {sport.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border/50 py-4 space-y-4">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar canchas, ubicación..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 bg-muted/50 border-0"
              />
            </div>

            {/* Mobile Sports Filter */}
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar por deporte
              </div>
              <div className="flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <Badge
                    key={sport.id}
                    variant={selectedSport === sport.id ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      selectedSport === sport.id
                        ? "bg-primary text-primary-foreground shadow-sport"
                        : "hover:border-primary hover:text-primary"
                    }`}
                    onClick={() => onSportChange(sport.id)}
                  >
                    <span className="mr-1">{sport.icon}</span>
                    {sport.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Ver Mapa
              </Button>
              
              {user ? (
                <>
                  <Button variant="outline" className="justify-start" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión ({user.email})
                  </Button>
                </>
              ) : (
                <Button asChild className="bg-gradient-sport justify-start">
                  <Link to="/auth">
                    Iniciar Sesión
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;