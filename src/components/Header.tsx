import { useEffect, useRef, useState } from "react";
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
import {
  MapPin,
  Search,
  Filter,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Home,
  Calendar,
  Layers,
  Info,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { motion, AnimatePresence } from "framer-motion";

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
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate("/");
  };

  // close on Esc and lock scroll when menu open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // close when click outside (overlay handles this but keep ref if needed)
  const closeMenu = () => setIsMenuOpen(false);

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

          {/* Desktop Search (visible on lg and up) */}
          <div className="hidden lg:flex items-center space-x-4 flex-1 max-w-md mx-8">
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

          {/* Desktop Actions (visible on lg and up) */}
          <div className="hidden lg:flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground border-border hover:border-primary hover:text-primary"
              onClick={() => document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" })}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Ver Mapa
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.email?.[0]?.toUpperCase() || "U"}
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
                  <DropdownMenuItem asChild>
                    <Link to="/my-reservations">
                      <Calendar className="mr-2 h-4 w-4" />
                      Mis Reservas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Mi Perfil
                    </Link>
                  </DropdownMenuItem>
                  {isOwner && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">
                        <Layers className="mr-2 h-4 w-4" />
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
            ) : (
              <Button asChild size="sm" className="bg-gradient-sport hover:shadow-sport transition-all">
                <Link to="/auth">Iniciar Sesión</Link>
              </Button>
            )}
          </div>

          {/* Mobile/Tablet Menu Button (visible under lg) */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((s) => !s)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Sports Filter Bar - visible on lg and up */}
        <div className="hidden lg:flex items-center space-x-2 py-3 border-t border-border/50">
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
      </div>

      {/* Mobile/Tablet Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeMenu}
              className="fixed inset-0 z-40 bg-black"
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-xs bg-background border-l border-border/60 shadow-2xl"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center space-x-2">
                  {/* <div className="w-8 h-8 bg-gradient-sport rounded flex items-center justify-center">
                    <span className="text-white font-bold text-sm">CL</span>
                  </div>
                  <div>
                    <div className="font-semibold">Cancha Libre</div>
                    <div className="text-xs text-muted-foreground">San Salvador de Jujuy</div>
                  </div> */}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto h-50px bg-white">
              

                {/* Account Actions */}
                <div className="pt-2 border-t border-border/50 space-y-2">
                  {user ? (
                    <>
                      <div className="text-sm">Conectado como</div>
                      <div className="font-medium break-words">{user.email}</div>

                      <Link to="/my-reservations" onClick={closeMenu} className="flex items-center gap-3 p-2 rounded hover:bg-muted/60">
                        <Calendar className="w-5 h-5" />
                        Mis Reservas
                      </Link>

                      <Link to="/profile" onClick={closeMenu} className="flex items-center gap-3 p-2 rounded hover:bg-muted/60">
                        <User className="w-5 h-5" />
                        Mi Perfil
                      </Link>

                      {isOwner && (
                        <Link to="/dashboard" onClick={closeMenu} className="flex items-center gap-3 p-2 rounded hover:bg-muted/60">
                          <Settings className="w-5 h-5" />
                          Mis Complejos
                        </Link>
                      )}

                      {isAdmin && (
                        <Link to="/admin" onClick={closeMenu} className="flex items-center gap-3 p-2 rounded hover:bg-muted/60">
                          <Settings className="w-5 h-5" />
                          Panel Admin
                        </Link>
                      )}

                      <button onClick={handleSignOut} className="flex items-center gap-3 p-2 rounded hover:bg-muted/60 w-full text-left">
                        <LogOut className="w-5 h-5" /> Cerrar Sesión
                      </button>
                    </>
                  ) : (
                    <Link to="/auth" onClick={closeMenu} className="block">
                      <Button className="w-full bg-gradient-sport justify-center">Iniciar Sesión</Button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
