import { ChevronRight, MapPin, Navigation, Trees, Warehouse, SunMedium } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SportComplexData } from "@/hooks/useComplexes";

interface SportComplexCardProps {
  complex: SportComplexData;
  selected?: boolean;
  distanceKm?: number | null;
  onSelect: (complex: SportComplexData) => void;
  onViewDetails: (complex: SportComplexData) => void;
}

const iconForAmenity = (amenity: string) => {
  const common = "h-3.5 w-3.5 shrink-0";
  if (/tech|techo/i.test(amenity)) return <Warehouse className={common} />;
  if (/ilumin/i.test(amenity)) return <SunMedium className={common} />;
  return <Trees className={common} />;
};

const formatDistance = (distanceKm: number) => distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;

const SportComplexCard = ({ complex, selected = false, distanceKm = null, onSelect, onViewDetails }: SportComplexCardProps) => {
  const sports = [...new Set([...complex.catalog_sports, ...(complex.courts ?? []).map((item) => item.sport)])];
  const labels = [...new Set((complex.courts ?? []).flatMap((item) => [item.has_roof ? "Techada" : null, item.has_lighting ? "Iluminada" : null, item.surface_type].filter((value): value is string => Boolean(value))))].slice(0, 3);
  const photo = complex.photos?.[0];
  return <button id={`complex-${complex.id}`} type="button" onClick={() => onSelect(complex)} aria-pressed={selected} className={`group grid w-full grid-cols-[132px_minmax(0,1fr)_auto] overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 sm:grid-cols-[156px_minmax(0,1fr)_auto] ${selected ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-slate-200"}`}>
    <div className="min-h-[152px] bg-gradient-to-br from-emerald-950 via-emerald-800 to-slate-800">{photo ? <img src={photo} alt={`Foto de ${complex.name}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-end p-3 text-xs font-medium text-white/80">Cancha Libre</div>}</div>
    <div className="min-w-0 space-y-2 px-3 py-3 sm:px-4"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-foreground">{complex.name}</h3>{sports.map((sport) => <Badge key={sport} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300">{sport}</Badge>)}</div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{complex.neighborhood || "Zona a confirmar"}</span><span className="truncate">{complex.address || "Dirección a confirmar"}</span></div>{Number.isFinite(distanceKm) && <p className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"><Navigation className="h-3.5 w-3.5" />A {formatDistance(distanceKm!)}</p>}{labels.length > 0 && <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-emerald-800 dark:text-emerald-300">{labels.map((amenity) => <span key={amenity} className="flex items-center gap-1">{iconForAmenity(amenity)}{amenity}</span>)}</div>}<span className="sr-only">Seleccionar {complex.name}</span></div>
    <span className="flex items-center pr-3 text-foreground transition-transform group-hover:translate-x-0.5"><ChevronRight className="h-5 w-5" /></span>
  </button>;
};

export default SportComplexCard;
