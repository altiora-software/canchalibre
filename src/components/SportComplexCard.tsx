import { ArrowUpRight, MapPin, Navigation, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SportComplexData } from "@/hooks/useComplexes";
import { formatArs, getComplexFallbackLabel, getComplexHighlights, getComplexSports, getStartingPrice } from "@/lib/complex-presentation";

interface SportComplexCardProps {
  complex: SportComplexData;
  selected?: boolean;
  distanceKm?: number | null;
  onSelect: (complex: SportComplexData) => void;
  onViewDetails?: (complex: SportComplexData) => void;
}

const formatDistance = (distanceKm: number) => distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;

const SportComplexCard = ({ complex, selected = false, distanceKm = null, onSelect }: SportComplexCardProps) => {
  const sports = getComplexSports(complex);
  const highlights = getComplexHighlights(complex);
  const startingPrice = getStartingPrice(complex.courts);
  const photo = complex.photos?.[0];

  return <article id={`complex-${complex.id}`} className={`overflow-hidden rounded-2xl border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-4 focus-within:ring-emerald-700/30 ${selected ? "border-emerald-700 ring-2 ring-emerald-700/40" : "border-border"}`}>
    <Link to={`/complex/${complex.id}`} className="group relative block min-h-44 overflow-hidden bg-slate-950 focus-visible:outline-none">
      {photo ? <img src={photo} alt={`Foto de ${complex.name}`} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(160_84%_38%/.75),transparent_35%),linear-gradient(135deg,hsl(222_32%_12%),hsl(160_64%_21%))]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
      {!photo && <div className="absolute right-4 top-4 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-white backdrop-blur">{getComplexFallbackLabel(complex)}</div>}
      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-200">{complex.neighborhood || "San Salvador de Jujuy"}</p><h3 className="mt-1 text-xl font-bold leading-tight">{complex.name}</h3></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-950 transition-transform group-hover:translate-x-0.5"><ArrowUpRight className="h-5 w-5" /><span className="sr-only">Abrir detalle de {complex.name}</span></span></div>
    </Link>
    <div className="space-y-4 p-4"><div className="flex flex-wrap gap-2">{sports.slice(0, 3).map((sport) => <Badge key={sport} variant="secondary" className="bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{sport}</Badge>)}{sports.length > 3 && <Badge variant="outline">+{sports.length - 3}</Badge>}</div><div className="grid grid-cols-2 gap-3 border-y py-3 text-sm"><div><p className="text-xs text-muted-foreground">Precio desde</p><p className="mt-0.5 font-bold text-foreground">{formatArs(startingPrice)}{startingPrice ? <span className="text-xs font-normal text-muted-foreground"> / hora</span> : null}</p></div><div><p className="text-xs text-muted-foreground">Ubicación</p><p className="mt-0.5 flex items-center gap-1 font-medium text-foreground"><MapPin className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-300" />{Number.isFinite(distanceKm) ? `A ${formatDistance(distanceKm!)}` : complex.neighborhood || "Ver mapa"}</p></div></div>{highlights.length > 0 && <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{highlights.map((highlight) => <li key={highlight.label} className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />{highlight.value}</li>)}</ul>}<div className="flex items-center gap-2"><Button asChild className="min-h-11 flex-1 bg-emerald-800 text-white hover:bg-emerald-900"><Link to={`/complex/${complex.id}`}>Ver complejo</Link></Button><Button type="button" variant={selected ? "secondary" : "outline"} className="min-h-11" aria-pressed={selected} onClick={() => onSelect(complex)}><Navigation className="mr-1.5 h-4 w-4" />{selected ? "En mapa" : "Mapa"}</Button></div></div>
  </article>;
};

export default SportComplexCard;
