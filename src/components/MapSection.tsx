import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SportComplexData } from "@/hooks/useComplexes";
import { NeighborhoodFallback } from "@/components/discovery/NeighborhoodFallback";

import "leaflet/dist/leaflet.css";

interface MapSectionProps {
  complexes: SportComplexData[];
  onSelectComplex: (complex: SportComplexData) => void;
}

interface MapLocation {
  complex: SportComplexData;
  position: [number, number];
}

const JUJUY_CENTER: [number, number] = [-24.1858, -65.3004];
const markerIcon = divIcon({
  className: "cancha-libre-map-marker",
  html: '<span aria-hidden="true"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const isPublishedPosition = (complex: SportComplexData): complex is SportComplexData & Required<Pick<SportComplexData, "latitude" | "longitude">> => {
  const latitude = Number(complex.latitude);
  const longitude = Number(complex.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

function FitLocations({ locations }: { locations: MapLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 1) {
      map.setView(locations[0].position, 15);
      return;
    }

    map.fitBounds(latLngBounds(locations.map((location) => location.position)), { padding: [40, 40], maxZoom: 15 });
  }, [locations, map]);

  return null;
}

function FocusLocation({ location }: { location: MapLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (location) map.flyTo(location.position, Math.max(map.getZoom(), 15), { duration: 0.45 });
  }, [location, map]);

  return null;
}

export default function MapSection({ complexes, onSelectComplex }: MapSectionProps) {
  const locations = useMemo<MapLocation[]>(() => complexes.filter(isPublishedPosition).slice(0, 50).map((complex) => ({ complex, position: [Number(complex.latitude), Number(complex.longitude)] })), [complexes]);
  const [selectedId, setSelectedId] = useState<string>(locations[0]?.complex.id ?? "");
  const selected = locations.find((location) => location.complex.id === selectedId) ?? null;

  useEffect(() => {
    if (!locations.some((location) => location.complex.id === selectedId)) setSelectedId(locations[0]?.complex.id ?? "");
  }, [locations, selectedId]);

  if (locations.length === 0) return <NeighborhoodFallback complexes={complexes} />;

  return <div className="relative h-[420px] overflow-hidden rounded-2xl border bg-muted shadow-sm lg:h-[560px]">
    <MapContainer center={JUJUY_CENTER} zoom={13} scrollWheelZoom className="h-full w-full" aria-label="Mapa de complejos deportivos">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitLocations locations={locations} />
      <FocusLocation location={selected} />
      {locations.map((location) => <Marker key={location.complex.id} position={location.position} icon={markerIcon} title={location.complex.name} eventHandlers={{ click: () => setSelectedId(location.complex.id) }} />)}
    </MapContainer>
    <div className="absolute inset-x-3 top-3 z-[1000] flex gap-2 overflow-x-auto pb-1 sm:inset-x-auto sm:left-3 sm:right-3"><span className="shrink-0 rounded-full bg-background/95 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur">{locations.length} ubicaciones publicadas</span>{locations.map((location) => <button key={location.complex.id} type="button" onClick={() => setSelectedId(location.complex.id)} aria-pressed={selectedId === location.complex.id} className="shrink-0 rounded-full border bg-background/95 px-3 py-2 text-left text-xs font-medium shadow-sm backdrop-blur transition-colors hover:border-primary aria-[pressed=true]:border-primary aria-[pressed=true]:bg-primary aria-[pressed=true]:text-primary-foreground">{location.complex.name}</button>)}</div>
    {selected && <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:left-auto sm:w-80"><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{selected.complex.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{selected.complex.neighborhood || selected.complex.address}</p></div></div><Button size="sm" className="mt-3 w-full" onClick={() => onSelectComplex(selected.complex)}><ExternalLink className="mr-2 h-4 w-4" />Ver complejo</Button></div>}
  </div>;
}
