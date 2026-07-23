import { CircleDot, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISCOVERY_SPORTS } from "./discovery-types";
interface Props { selected: string; onSelect: (sport: string) => void; }
export function SportRail({ selected, onSelect }: Props) { return <nav className="flex gap-2 overflow-x-auto py-1" aria-label="Filtrar por deporte">{DISCOVERY_SPORTS.map((sport, index) => <Button key={sport.id} type="button" variant={selected === sport.id ? "default" : "outline"} size="sm" className={`shrink-0 rounded-xl px-4 ${selected === sport.id ? "bg-emerald-700 text-white hover:bg-emerald-800" : "border-slate-200 bg-card hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-emerald-950"}`} onClick={() => onSelect(sport.id)}>{index === 0 ? <Grid2X2 className="mr-1.5 h-3.5 w-3.5" /> : <CircleDot className="mr-1.5 h-3.5 w-3.5" />}{sport.label}</Button>)}</nav>; }
