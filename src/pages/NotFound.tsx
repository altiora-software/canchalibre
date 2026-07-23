import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border/80 bg-card p-8 text-center shadow-card-custom">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Ruta no encontrada</p>
        <h1 className="mb-4 text-5xl font-bold">404</h1>
        <p className="mb-6 text-lg text-foreground/75">La pagina que buscas no existe o fue movida.</p>
        <a href="/" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
