import { List, Map, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DiscoveryCriteria } from "./discovery-types";

interface Props { count: number; criteria: DiscoveryCriteria; onChange: (patch: Partial<DiscoveryCriteria>) => void; }
export function ResultsToolbar({ count, criteria, onChange }: Props) {
  return <div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{count}</span> {count === 1 ? "complejo encontrado" : "complejos encontrados"}{criteria.time && <span> · hora preferida {criteria.time}</span>}</p>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant={criteria.roofOnly ? "secondary" : "outline"} onClick={() => onChange({ roofOnly: !criteria.roofOnly })}><SlidersHorizontal className="mr-1.5 h-4 w-4" />Techada</Button>
      <Button type="button" size="sm" variant={criteria.lightingOnly ? "secondary" : "outline"} onClick={() => onChange({ lightingOnly: !criteria.lightingOnly })}>Iluminada</Button>
      <Select value={criteria.sort} onValueChange={(sort) => onChange({ sort: sort as DiscoveryCriteria["sort"] })}><SelectTrigger className="w-40" aria-label="Ordenar resultados"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="relevance">Más relevantes</SelectItem><SelectItem value="price">Menor precio</SelectItem><SelectItem value="name">Nombre</SelectItem></SelectContent></Select>
      <div className="flex rounded-md border p-0.5"><Button size="icon" variant={criteria.view === "list" ? "secondary" : "ghost"} aria-label="Ver lista" onClick={() => onChange({ view: "list" })}><List className="h-4 w-4" /></Button><Button size="icon" variant={criteria.view === "map" ? "secondary" : "ghost"} aria-label="Ver mapa" onClick={() => onChange({ view: "map" })}><Map className="h-4 w-4" /></Button></div>
    </div>
  </div>;
}
