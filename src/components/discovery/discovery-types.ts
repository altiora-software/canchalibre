export const DISCOVERY_SPORTS = [
  { id: "todos", label: "Todos" }, { id: "futbol", label: "Fútbol" }, { id: "basquet", label: "Básquet" },
  { id: "padel", label: "Pádel" }, { id: "tenis", label: "Tenis" }, { id: "voley", label: "Vóley" },
] as const;

export type DiscoverySport = (typeof DISCOVERY_SPORTS)[number]["id"];
export type DiscoveryView = "list" | "map";
export type DiscoverySort = "relevance" | "price" | "name";

export interface DiscoveryCriteria {
  sport: string;
  query: string;
  date: string;
  time: string;
  roofOnly: boolean;
  lightingOnly: boolean;
  sort: DiscoverySort;
  view: DiscoveryView;
}
