// src/components/map/MapSection.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { useComplexes } from "@/hooks/useComplexes";

type MapLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sportPrimary: string;     // deporte principal (primera cancha)
  sports: string[];         // todos los deportes del complejo
  isOpen: boolean;
  address: string;
  whatsapp: string | null;
};

interface MapSectionProps {
  selectedSport: string; // 'todos' | 'fútbol' | 'tenis' | ...
  onLocationSelect: (location: MapLocation) => void;
}

const DEFAULT_CENTER = { lat: -24.1858, lng: -65.3004 }; // San Salvador de Jujuy

export default function MapSection({ selectedSport, onLocationSelect }: MapSectionProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapView, setMapView] = useState<"roadmap" | "satellite">("roadmap");
  const [selected, setSelected] = useState<MapLocation | null>(null);

  const { complexes } = useComplexes();

  // 1) Complejos -> MapLocations (solo con geo válida)
  const locations: MapLocation[] = useMemo(() => {
    return (complexes ?? [])
      .filter(c => typeof c.latitude === "number" && typeof c.longitude === "number")
      .map(c => {
        const sports = (c.courts ?? []).map(ct => (ct.sport || "").toLowerCase());
        return {
          id: c.id,
          name: c.name,
          lat: c.latitude as number,
          lng: c.longitude as number,
          sportPrimary: sports[0] || "fútbol",
          sports,
          isOpen: !!c.is_active,
          address: c.address,
          whatsapp: c.whatsapp ?? null,
        };
      });
  }, [complexes]);

  // 2) Filtrado por deporte (si selectedSport != 'todos')
  const filtered = useMemo(() => {
    if (!locations.length) return [];
    if (selectedSport.toLowerCase() === "todos") return locations;
    const key = selectedSport.toLowerCase();
    return locations.filter(l => l.sports.some(s => s === key));
  }, [locations, selectedSport]);

  // 3) Centro del mapa: complejo seleccionado -> centro; si no, centro del bbox; si no, default
  const mapCenter = useMemo(() => {
    if (selected) return { lat: selected.lat, lng: selected.lng };
    if (filtered.length > 0) {
      const minLat = Math.min(...filtered.map(f => f.lat));
      const maxLat = Math.max(...filtered.map(f => f.lat));
      const minLng = Math.min(...filtered.map(f => f.lng));
      const maxLng = Math.max(...filtered.map(f => f.lng));
      return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
    }
    return DEFAULT_CENTER;
  }, [selected, filtered]);

  // 4) Proyección simple (bbox -> % pantalla)
  const projector = useMemo(() => {
    if (filtered.length < 2) {
      // con 0/1 puntos, los dejamos centrados
      return (lat: number, lng: number) => ({ leftPct: 50, topPct: 50 });
    }
    const minLat = Math.min(...filtered.map(f => f.lat));
    const maxLat = Math.max(...filtered.map(f => f.lat));
    const minLng = Math.min(...filtered.map(f => f.lng));
    const maxLng = Math.max(...filtered.map(f => f.lng));

    // margen en porcentaje para que no queden pegados a los bordes
    const pad = 6; // %
    return (lat: number, lng: number) => {
      const leftPct =
        pad +
        ((lng - minLng) / Math.max(0.000001, (maxLng - minLng))) * (100 - 2 * pad);
      const topPct =
        pad +
        (1 - (lat - minLat) / Math.max(0.000001, (maxLat - minLat))) * (100 - 2 * pad);
      return {
        leftPct: Math.min(100 - pad, Math.max(pad, leftPct)),
        topPct: Math.min(100 - pad, Math.max(pad, topPct)),
      };
    };
  }, [filtered]);

  const getSportEmoji = (s: string) => {
    const key = s.toLowerCase();
    if (key.includes("fut") || key.includes("fútbol")) return "⚽";
    if (key.includes("basq")) return "🏀";
    if (key.includes("ten")) return "🎾";
    if (key.includes("vol") || key.includes("vóley")) return "🏐";
    if (key.includes("hand")) return "🤾";
    if (key.includes("skate")) return "🛹";
    return "🏆";
  };

  const handleSelect = (loc: MapLocation) => {
    setSelected(loc);
    onLocationSelect(loc);
  };

  const goWhatsApp = (loc: MapLocation) => {
    if (!loc.whatsapp) return;
    const msg = `Hola! Me interesa información sobre ${loc.name} en ${loc.address}`;
    const url = `https://wa.me/${loc.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${mapCenter.lat},${mapCenter.lng}&zoom=13`;
    window.open(url, "_blank");
  };

  // Iframe centrado dinámicamente (formato simple de embed)
  const iframeSrc = useMemo(() => {
    const z = 13;
    // output=embed funciona para centrar con query lat,lng
    return `https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}&z=${z}&output=embed`;
  }, [mapCenter]);

  return (
    <div className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-white" : "h-[400px] lg:h-[500px]"} transition-all duration-300`}>
      <div className="relative w-full h-full rounded-lg overflow-hidden border border-border shadow-card-custom">
        {/* MAPA */}
        <iframe
          src={iframeSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Mapa de complejos deportivos"
        />

        {/* MARCADORES (overlay) */}
        <div className="absolute inset-0 pointer-events-none">
          {filtered.map((loc) => {
            const { leftPct, topPct } = projector(loc.lat, loc.lng);
            return (
              <div
                key={loc.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              >
                <div
                  className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-all border-2 border-white group"
                  onClick={() => handleSelect(loc)}
                >
                  <span className="text-sm">{getSportEmoji(loc.sportPrimary)}</span>
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                    <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {loc.name}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* TARJETA DE UBICACIÓN */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-80">
            <Card className="shadow-lg border-0 shadow-card-hover">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-lg">{selected.name}</h4>
                  <Badge variant={selected.isOpen ? "default" : "secondary"}>
                    {selected.isOpen ? "Abierto" : "Cerrado"}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">{selected.address}</p>

                <div className="flex flex-wrap gap-1 text-sm">
                  {selected.sports.slice(0, 4).map((s, i) => (
                    <Badge key={i} variant="outline">{getSportEmoji(s)} {s}</Badge>
                  ))}
                  {selected.sports.length > 4 && <Badge variant="secondary">+{selected.sports.length - 4}</Badge>}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={!selected.whatsapp} onClick={() => goWhatsApp(selected)}>
                    <span className="mr-2">📱</span> WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelected(null)}>
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CONTROLES DEL MAPA */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
            onClick={() => setIsFullscreen(v => !v)}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
            onClick={() => setMapView(v => (v === "roadmap" ? "satellite" : "roadmap"))}
            title="Vista (decorativa – el iframe simple no cambia estilos)"
          >
            <Layers className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
            onClick={openInGoogleMaps}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* CONTADOR */}
        <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground rounded-lg px-3 py-2 shadow-sm z-10">
          <span className="text-sm font-medium">{filtered.length} ubicaciones</span>
        </div>
      </div>

      {isFullscreen && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            onClick={() => setIsFullscreen(false)}
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Salir de pantalla completa
          </Button>
        </div>
      )}
    </div>
  );
}
