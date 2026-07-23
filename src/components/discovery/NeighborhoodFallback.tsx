import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SportComplexData } from "@/hooks/useComplexes";

export function NeighborhoodFallback({ complexes }: { complexes: SportComplexData[] }) {
  const neighborhoods = Object.entries(complexes.reduce<Record<string, number>>((result, complex) => { const name = complex.neighborhood?.trim() || "Otras zonas"; result[name] = (result[name] ?? 0) + 1; return result; }, {})).sort(([, left], [, right]) => right - left);
  return <Card className="h-full border-dashed bg-muted/30"><CardContent className="p-6"><MapPin className="mb-3 h-5 w-5 text-primary" /><h3 className="font-semibold">Explorá por barrio</h3><p className="mt-1 text-sm text-muted-foreground">El mapa aparece cuando los complejos tienen una ubicación publicada.</p><div className="mt-5 space-y-2">{neighborhoods.length ? neighborhoods.map(([name, count]) => <div key={name} className="flex justify-between rounded-md bg-background px-3 py-2 text-sm"><span>{name}</span><span className="text-muted-foreground">{count}</span></div>) : <p className="text-sm text-muted-foreground">No hay ubicaciones publicadas todavía.</p>}</div></CardContent></Card>;
}
