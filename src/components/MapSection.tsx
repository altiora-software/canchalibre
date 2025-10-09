// src/components/map/MapSection.tsx
import { useMemo, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { useComplexes } from "@/hooks/useComplexes";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";

type MapLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sportPrimary: string;
  sports: string[];
  isOpen: boolean;
  address: string;
  whatsapp: string | null;
};

interface MapSectionProps {
  selectedSport: string; // 'todos' | 'fútbol' | 'tenis' | ...
  onLocationSelect: (location: MapLocation) => void;
}

const DEFAULT_CENTER = { lat: -24.1858, lng: -65.3004 }; // San Salvador de Jujuy
const MAP_LIBRARIES: ("places")[] = ["places"];

export default function MapSection({ selectedSport, onLocationSelect }: MapSectionProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapView, setMapView] = useState<"roadmap" | "satellite">("roadmap");
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { complexes } = useComplexes();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  // transform complexes -> locations
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

  const filtered = useMemo(() => {
    if (!locations.length) return [];
    if (selectedSport.toLowerCase() === "todos") return locations;
    const key = selectedSport.toLowerCase();
    return locations.filter(l => l.sports.some(s => s === key));
  }, [locations, selectedSport]);

  const getSportEmoji = (s: string) => {
    const key = s.toLowerCase();
    if (key.includes("fut")) return "⚽";
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
    // center map on selection
    if (mapRef.current) {
      mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
      mapRef.current.setZoom(15);
    }
  };

  const goWhatsApp = (loc: MapLocation) => {
    if (!loc.whatsapp) return;
    const msg = `Hola! Me interesa información sobre ${loc.name} en ${loc.address}`;
    const url = `https://wa.me/${loc.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const openInGoogleMaps = () => {
    const center = selected ? { lat: selected.lat, lng: selected.lng } : (filtered.length ? { lat: filtered[0].lat, lng: filtered[0].lng } : DEFAULT_CENTER);
    const url = `https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}&zoom=13`;
    window.open(url, "_blank");
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Fit bounds to filtered markers
    if (filtered.length) {
      const bounds = new google.maps.LatLngBounds();
      filtered.forEach((f) => bounds.extend({ lat: f.lat, lng: f.lng }));
      map.fitBounds(bounds, 80);
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(13);
    }
  }, [filtered]);

  // When filtered changes, fit bounds again
  const fitToFiltered = useCallback(() => {
    if (!mapRef.current) return;
    if (filtered.length === 0) {
      mapRef.current.setCenter(DEFAULT_CENTER);
      mapRef.current.setZoom(13);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    filtered.forEach((f) => bounds.extend({ lat: f.lat, lng: f.lng }));
    mapRef.current.fitBounds(bounds, 80);
  }, [filtered]);

  // try to refit whenever filtered changes (after load)
  if (isLoaded && mapRef.current) {
    fitToFiltered();
  }

  if (loadError) {
    return <div className="p-4">Error cargando Google Maps</div>;
  }

  return (
    <div className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-white" : "h-[400px] lg:h-[500px]"} transition-all duration-300`}>
      <div className="relative w-full h-full rounded-lg overflow-hidden border border-border shadow-card-custom">
        {!isLoaded ? (
          <div className="w-full h-full flex items-center justify-center">Cargando mapa...</div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={DEFAULT_CENTER}
            zoom={13}
            onLoad={onMapLoad}
            mapTypeId={mapView}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {filtered.map((loc) => (
              <Marker
                key={loc.id}
                position={{ lat: loc.lat, lng: loc.lng }}
                onClick={() => handleSelect(loc)}
                title={loc.name}
              />
            ))}

            {selected && (
              <InfoWindow
                position={{ lat: selected.lat, lng: selected.lng }}
                onCloseClick={() => setSelected(null)}
              >
                <div style={{ maxWidth: 240 }}>
                  <div className="font-semibold">{selected.name}</div>
                  <div className="text-sm text-muted-foreground">{selected.address}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => goWhatsApp(selected)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">WhatsApp</button>
                    <button onClick={() => openInGoogleMaps()} className="px-2 py-1 border rounded text-sm">Abrir</button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
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
            title="Cambiar vista"
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
