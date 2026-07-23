import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SportComplexData } from "@/hooks/useComplexes";
import { NeighborhoodFallback } from "@/components/discovery/NeighborhoodFallback";

interface MapSectionProps {
  complexes: SportComplexData[];
  onSelectComplex: (complex: SportComplexData) => void;
}

interface MapLocation {
  complex: SportComplexData;
  position: google.maps.LatLngLiteral;
}

const JUJUY_CENTER: google.maps.LatLngLiteral = { lat: -24.1858, lng: -65.3004 };
const MAP_OPTIONS: google.maps.MapOptions = {
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  clickableIcons: false,
  gestureHandling: "cooperative",
  zoomControlOptions: { position: 9 },
};

const isPublishedPosition = (complex: SportComplexData): complex is SportComplexData & Required<Pick<SportComplexData, "latitude" | "longitude">> => {
  const latitude = Number(complex.latitude);
  const longitude = Number(complex.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

function MapCanvas({ locations, onSelectComplex }: { locations: MapLocation[]; onSelectComplex: (complex: SportComplexData) => void }) {
  const [selectedId, setSelectedId] = useState<string>(locations[0]?.complex.id ?? "");
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "cancha-libre-google-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const selected = locations.find((location) => location.complex.id === selectedId) ?? null;
  const fitLocations = useCallback(() => {
    if (!mapRef.current || !window.google || locations.length === 0) return;
    if (locations.length === 1) {
      mapRef.current.setCenter(locations[0].position);
      mapRef.current.setZoom(15);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    locations.forEach(({ position }) => bounds.extend(position));
    mapRef.current.fitBounds(bounds, 56);
  }, [locations]);

  useEffect(() => {
    fitLocations();
  }, [fitLocations]);

  const focusLocation = (location: MapLocation) => {
    setSelectedId(location.complex.id);
    mapRef.current?.panTo(location.position);
    mapRef.current?.setZoom(Math.max(mapRef.current.getZoom() ?? 13, 15));
  };

  if (loadError) {
    return <MapUnavailable reason="No pudimos cargar Google Maps. Probá de nuevo o explorá los complejos por barrio." />;
  }

  return <div className="relative h-[420px] overflow-hidden rounded-2xl border bg-muted shadow-sm lg:h-[560px]">
    {!isLoaded ? <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"><Navigation className="h-4 w-4 animate-pulse" />Cargando mapa…</div> : <GoogleMap mapContainerStyle={{ height: "100%", width: "100%" }} center={JUJUY_CENTER} zoom={13} onLoad={(map) => { mapRef.current = map; fitLocations(); }} options={MAP_OPTIONS}>
      {locations.map((location) => <Marker key={location.complex.id} position={location.position} title={location.complex.name} animation={selectedId === location.complex.id ? google.maps.Animation.DROP : undefined} onClick={() => focusLocation(location)} />)}
      {selected && <InfoWindow position={selected.position} onCloseClick={() => setSelectedId("")}><div className="max-w-56 p-1"><p className="font-semibold text-foreground">{selected.complex.name}</p><p className="mt-1 text-sm text-muted-foreground">{selected.complex.neighborhood || selected.complex.address}</p><Button size="sm" className="mt-3" onClick={() => onSelectComplex(selected.complex)}><ExternalLink className="mr-2 h-4 w-4" />Ver complejo</Button></div></InfoWindow>}
    </GoogleMap>}
    {isLoaded && <div className="absolute inset-x-3 top-3 z-10 flex gap-2 overflow-x-auto pb-1 sm:inset-x-auto sm:left-3 sm:right-3"><span className="shrink-0 rounded-full bg-background/95 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur">{locations.length} ubicaciones publicadas</span>{locations.map((location) => <button key={location.complex.id} type="button" onClick={() => focusLocation(location)} aria-pressed={selectedId === location.complex.id} className="shrink-0 rounded-full border bg-background/95 px-3 py-2 text-left text-xs font-medium shadow-sm backdrop-blur transition-colors hover:border-primary aria-[pressed=true]:border-primary aria-[pressed=true]:bg-primary aria-[pressed=true]:text-primary-foreground">{location.complex.name}</button>)}</div>}
    {isLoaded && selected && <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:left-auto sm:w-80"><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{selected.complex.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{selected.complex.neighborhood || selected.complex.address}</p></div></div><Button size="sm" className="mt-3 w-full" onClick={() => onSelectComplex(selected.complex)}>Ver complejo</Button></div>}
  </div>;
}

function MapUnavailable({ reason }: { reason: string }) {
  return <Card className="h-full min-h-[300px] border-dashed bg-muted/30"><CardContent className="flex h-full flex-col items-center justify-center p-6 text-center"><MapPin className="mb-3 h-6 w-6 text-primary" /><h3 className="font-semibold">Mapa no disponible</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">{reason}</p></CardContent></Card>;
}

export default function MapSection({ complexes, onSelectComplex }: MapSectionProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  const locations = useMemo<MapLocation[]>(() => complexes.filter(isPublishedPosition).map((complex) => ({ complex, position: { lat: Number(complex.latitude), lng: Number(complex.longitude) } })), [complexes]);

  if (!apiKey) {
    return <MapUnavailable reason="El mapa se habilita al configurar la clave pública de Google Maps. Mientras tanto, explorá los complejos por barrio." />;
  }

  if (locations.length === 0) {
    return <NeighborhoodFallback complexes={complexes} />;
  }

  return <MapCanvas locations={locations} onSelectComplex={onSelectComplex} />;
}
