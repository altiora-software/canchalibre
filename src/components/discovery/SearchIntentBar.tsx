import { CalendarDays, Clock3, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISCOVERY_SPORTS, DiscoveryCriteria } from "./discovery-types";

interface Props { criteria: DiscoveryCriteria; onChange: (patch: Partial<DiscoveryCriteria>) => void; onSearch: () => void; }
const isoDate = (offset: number) => { const value = new Date(); value.setDate(value.getDate() + offset); return value.toISOString().slice(0, 10); };

export function SearchIntentBar({ criteria, onChange, onSearch }: Props) {
  const quickDates = [{ label: "Hoy", value: isoDate(0) }, { label: "Mañana", value: isoDate(1) }, { label: "En 2 días", value: isoDate(2) }];
  return <form className="rounded-[22px] border border-white/70 bg-card p-5 text-card-foreground shadow-2xl md:p-6" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
    <div className="mb-5"><p className="text-base font-bold text-foreground">Decinos qué partido querés jugar</p><p className="text-xs text-muted-foreground">Elegí tus preferencias para encontrar complejos compatibles.</p></div>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1.35fr_0.9fr_0.8fr_auto] lg:items-end">
      <div className="space-y-1.5"><Label htmlFor="discovery-sport">1. Deporte</Label><Select value={criteria.sport} onValueChange={(sport) => onChange({ sport })}><SelectTrigger id="discovery-sport"><SelectValue placeholder="Elegí un deporte" /></SelectTrigger><SelectContent>{DISCOVERY_SPORTS.map((sport) => <SelectItem key={sport.id} value={sport.id}>{sport.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label htmlFor="discovery-location">2. ¿En qué zona?</Label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="discovery-location" value={criteria.query} onChange={(event) => onChange({ query: event.target.value })} className="pl-9" placeholder="Ej. Centro, Alto Comedero" /></div></div>
      <div className="space-y-1.5"><Label htmlFor="discovery-date">3. ¿Qué día?</Label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="discovery-date" className="pl-9" type="date" min={isoDate(0)} value={criteria.date} onChange={(event) => onChange({ date: event.target.value })} /></div></div>
      <div className="space-y-1.5"><Label htmlFor="discovery-time">4. Hora aproximada</Label><div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="discovery-time" className="pl-9" type="time" value={criteria.time} onChange={(event) => onChange({ time: event.target.value })} /></div></div>
      <Button type="submit" className="h-10 bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"><Search className="mr-2 h-4 w-4" />Ver opciones</Button>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Elegí rápido:</span>{quickDates.map((date) => <Button key={date.value} type="button" size="sm" variant={criteria.date === date.value ? "default" : "outline"} className={criteria.date === date.value ? "bg-emerald-700 hover:bg-emerald-800" : "bg-card"} onClick={() => onChange({ date: date.value })}>{date.label}</Button>)}<span className="ml-1 text-xs text-muted-foreground">Después seleccionás la cancha y confirmás el turno.</span></div>
  </form>;
}
