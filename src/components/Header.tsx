import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Layers, LogOut, MapPin, Menu, Settings, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isOwner, isAdmin } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setIsMenuOpen(false);
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate("/");
  };

  const accountLinks = (
    <>
      <Link to="/my-reservations" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
        <Calendar className="h-4 w-4" /> Mis reservas
      </Link>
      <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
        <User className="h-4 w-4" /> Mi perfil
      </Link>
      {isOwner && <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"><Layers className="h-4 w-4" /> Mis complejos</Link>}
      {isAdmin && <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"><Settings className="h-4 w-4" /> Administración</Link>}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 text-card-foreground shadow-sm backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" aria-label="Cancha Libre, inicio">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-sport font-bold text-white">CL</div>
          <div><p className="font-bold leading-none">Cancha Libre</p><p className="mt-1 text-xs text-foreground/70">San Salvador de Jujuy</p></div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex"><Link className="border-b-2 border-emerald-700 py-[22px] text-emerald-800" to="/">Encontrar complejos</Link><Link className="py-[22px] hover:text-emerald-800" to="/owners/apply">Publicá tu complejo</Link></nav>
        <div className="hidden items-center gap-3 md:flex">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground xl:flex"><MapPin className="h-3.5 w-3.5" />San Salvador de Jujuy</span>
          <Button asChild variant="ghost" size="sm" className="text-foreground hover:bg-muted hover:text-foreground"><Link to="/owners/apply">Publicá tu complejo</Link></Button>
          {user ? (
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="p-1"><Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground">{user.email?.[0]?.toUpperCase() ?? "U"}</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56"><DropdownMenuItem disabled>{user.email}</DropdownMenuItem><DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/my-reservations"><Calendar className="mr-2 h-4 w-4" />Mis reservas</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" />Mi perfil</Link></DropdownMenuItem>
                {isOwner && <DropdownMenuItem asChild><Link to="/dashboard"><Layers className="mr-2 h-4 w-4" />Mis complejos</Link></DropdownMenuItem>}
                {isAdmin && <DropdownMenuItem asChild><Link to="/admin"><Settings className="mr-2 h-4 w-4" />Administración</Link></DropdownMenuItem>}
                <DropdownMenuSeparator /><DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent></DropdownMenu>
          ) : <Button asChild size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800"><Link to="/auth">Ingresar</Link></Button>}
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}>{isMenuOpen ? <X /> : <Menu />}</Button>
      </div>
      {isMenuOpen && <div className="border-t bg-card p-4 text-card-foreground md:hidden"><div className="space-y-2">{user ? <>{accountLinks}<button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"><LogOut className="h-4 w-4" />Cerrar sesión</button></> : <Button asChild className="w-full bg-emerald-700 text-white hover:bg-emerald-800"><Link to="/auth" onClick={() => setIsMenuOpen(false)}>Ingresar</Link></Button>}<Button asChild variant="outline" className="w-full border-foreground/30 bg-card text-foreground hover:bg-muted hover:text-foreground"><Link to="/owners/apply" onClick={() => setIsMenuOpen(false)}>Publicá tu complejo</Link></Button></div></div>}
    </header>
  );
};

export default Header;
