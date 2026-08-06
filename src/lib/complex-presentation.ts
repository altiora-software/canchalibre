import { CourtData, SportComplexData } from "@/hooks/useComplexes";

export interface ComplexHighlight { label: string; value: string; }

export const formatArs = (value: number | null | undefined) => value && value > 0
  ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value)
  : "Precio a confirmar";

export const getComplexSports = (complex: SportComplexData) => [...new Set([...complex.catalog_sports, ...(complex.courts ?? []).map((court) => court.sport)])];

export const getStartingPrice = (courts: CourtData[] | undefined) => {
  const prices = (courts ?? []).map((court) => court.hourly_price).filter((price): price is number => typeof price === "number" && price > 0);
  return prices.length ? Math.min(...prices) : null;
};

export const getComplexHighlights = (complex: SportComplexData): ComplexHighlight[] => {
  const courts = complex.courts ?? [];
  const highlights: ComplexHighlight[] = [];
  const capacity = Math.max(...courts.map((court) => court.players_capacity).filter((value) => value > 0), 0);
  if (capacity) highlights.push({ label: "Jugadores", value: `Hasta ${capacity}` });
  if (courts.some((court) => court.has_roof)) highlights.push({ label: "Cancha", value: "Techada" });
  if (courts.some((court) => court.has_lighting)) highlights.push({ label: "Horario", value: "Con luz" });
  return highlights.slice(0, 3);
};

export const getComplexFallbackLabel = (complex: SportComplexData) => getComplexSports(complex)[0] ?? "Deporte";
