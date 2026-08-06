import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SportComplexData } from "@/hooks/useComplexes";
import { NeighborhoodFallback } from "@/components/discovery/NeighborhoodFallback";

import "leaflet/dist/leaflet.css";

interface MapSectionProps {
  complexes: SportComplexData[];
  selectedComplexId: string | null;
  userLocation: Coordinates | null;
  onSelectComplex: (complex: SportComplexData) => void;
  onViewDetails: (complex: SportComplexData) => void;
}

interface Coordinates { latitude: number; longitude: number; }

interface MapLocation {
  complex: SportComplexData;
  position: [number, number];
}

const JUJUY_CENTER: [number, number] = [-24.1858, -65.3004];
const createMarkerIcon = (selected: boolean) => divIcon({
  className: `cancha-libre-map-marker${selected ? " is-selected" : ""}`,
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
    if (location) map.flyTo(location.position, Math.max(map.getZoom(), 15), { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.45 });
  }, [location, map]);

  return null;
}

function FocusUserLocation({ userLocation }: { userLocation: Coordinates | null }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) map.flyTo([userLocation.latitude, userLocation.longitude], 14, { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.45 });
  }, [userLocation, map]);

  return null;
}

export default function MapSection({ complexes, selectedComplexId, userLocation, onSelectComplex, onViewDetails }: MapSectionProps) {
  const locations = useMemo<MapLocation[]>(() => complexes.filter(isPublishedPosition).slice(0, 50).map((complex) => ({ complex, position: [Number(complex.latitude), Number(complex.longitude)] })), [complexes]);
  const [selectedId, setSelectedId] = useState<string>(selectedComplexId ?? "");
  const selected = locations.find((location) => location.complex.id === selectedId) ?? null;

  useEffect(() => {
    if (!locations.some((location) => location.complex.id === selectedId)) setSelectedId(locations[0]?.complex.id ?? "");
  }, [locations, selectedId]);

  useEffect(() => {
    if (selectedComplexId && locations.some((location) => location.complex.id === selectedComplexId)) setSelectedId(selectedComplexId);
  }, [locations, selectedComplexId]);

  const selectLocation = (location: MapLocation) => {
    setSelectedId(location.complex.id);
    onSelectComplex(location.complex);
  };

  if (locations.length === 0) return <NeighborhoodFallback complexes={complexes} />;

  return <div className="relative h-[56vh] min-h-[460px] overflow-hidden rounded-2xl border bg-muted shadow-sm xl:h-full">
    <MapContainer center={JUJUY_CENTER} zoom={13} scrollWheelZoom className="h-full w-full" aria-label="Mapa de complejos deportivos">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitLocations locations={locations} />
      <FocusLocation location={selected} />
      <FocusUserLocation userLocation={userLocation} />
      {userLocation && <CircleMarker center={[userLocation.latitude, userLocation.longitude]} radius={9} pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 3 }}><Tooltip direction="top" offset={[0, -8]} opacity={1}>Tu ubicación</Tooltip></CircleMarker>}
      {locations.map((location) => <Marker key={location.complex.id} position={location.position} icon={createMarkerIcon(location.complex.id === selectedId)} title={`${location.complex.name}${location.complex.id === selectedId ? ", seleccionado" : ""}`} keyboard eventHandlers={{ click: () => selectLocation(location), keypress: () => selectLocation(location) }} />)}
    </MapContainer>
    <div className="absolute left-3 top-3 z-[1000] rounded-lg border bg-background/95 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur"><span aria-hidden="true">●</span> {locations.length} ubicaciones · Tocá un marcador para ver su ficha</div>
    {selected && <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl border-2 border-emerald-700 bg-background/95 p-3 shadow-lg backdrop-blur sm:left-auto sm:w-80"><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{selected.complex.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{selected.complex.neighborhood || selected.complex.address}</p><p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">Seleccionado en el listado</p></div></div><Button size="sm" className="mt-3 w-full" onClick={() => onViewDetails(selected.complex)}><ExternalLink className="mr-2 h-4 w-4" />Ver complejo</Button></div>}
  </div>;
}
