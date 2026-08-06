import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Loader2, LocateFixed, MapPin, MessageCircle, RotateCcw, Search } from "lucide-react";
import Header from "@/components/Header";
import MapSection from "@/components/MapSection";
import SportComplexCard from "@/components/SportComplexCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useComplexes, SportComplexData } from "@/hooks/useComplexes";
import { useProfile } from "@/hooks/useProfile";
import { ResultsToolbar } from "@/components/discovery/ResultsToolbar";
import { SearchIntentBar } from "@/components/discovery/SearchIntentBar";
import { SportRail } from "@/components/discovery/SportRail";
import { DiscoveryCriteria, DiscoverySort, DiscoveryView } from "@/components/discovery/discovery-types";

type Coordinates = { latitude: number; longitude: number };

const RESULTS_PER_PAGE = 10;
const today = new Date().toISOString().slice(0, 10);
const toBoolean = (value: string | null) => value === "true";
const validSort = (value: string | null): DiscoverySort => value === "price" || value === "name" ? value : "relevance";
const validView = (value: string | null): DiscoveryView => value === "list" ? "list" : "map";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const hasCoordinates = (complex: SportComplexData) => Number.isFinite(Number(complex.latitude)) && Number.isFinite(Number(complex.longitude));

const distanceInKm = (origin: Coordinates, complex: SportComplexData) => {
  if (!hasCoordinates(complex)) return Number.POSITIVE_INFINITY;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDistance = toRadians(Number(complex.latitude) - origin.latitude);
  const longitudeDistance = toRadians(Number(complex.longitude) - origin.longitude);
  const a = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(toRadians(origin.latitude)) * Math.cos(toRadians(Number(complex.latitude))) * Math.sin(longitudeDistance / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function Index() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const criteria = useMemo<DiscoveryCriteria>(() => ({ sport: params.get("sport") || "todos", query: params.get("q") || "", date: params.get("date") || today, time: params.get("time") || "", roofOnly: toBoolean(params.get("roof")), lightingOnly: toBoolean(params.get("lighting")), sort: validSort(params.get("sort")), view: validView(params.get("view")) }), [params]);
  const { user } = useAuth();
  const { isOwner } = useProfile();
  const { complexes, loading, loadingMore, hasMore, error, loadMore } = useComplexes(user?.id ?? null, false, criteria.sport);
  const [selectedComplexId, setSelectedComplexId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { if (isOwner) navigate("/dashboard", { replace: true }); }, [isOwner, navigate]);
  useEffect(() => { setCurrentPage(1); }, [criteria.sport, criteria.query, criteria.roofOnly, criteria.lightingOnly, criteria.sort, userLocation]);

  const updateCriteria = (patch: Partial<DiscoveryCriteria>) => {
    const next = { ...criteria, ...patch };
    const nextParams = new URLSearchParams();
    if (next.sport !== "todos") nextParams.set("sport", next.sport);
    if (next.query.trim()) nextParams.set("q", next.query.trim());
    if (next.date !== today) nextParams.set("date", next.date);
    if (next.time) nextParams.set("time", next.time);
    if (next.roofOnly) nextParams.set("roof", "true");
    if (next.lightingOnly) nextParams.set("lighting", "true");
    if (next.sort !== "relevance") nextParams.set("sort", next.sort);
    setParams(nextParams, { replace: true });
  };

  const filtered = useMemo(() => complexes.filter((complex) => {
    const courts = complex.courts ?? [];
    const sports = [...complex.catalog_sports, ...courts.map((court) => court.sport)];
    const text = normalize([complex.name, complex.neighborhood ?? "", complex.address, ...sports].join(" "));
    const selectedSport = normalize(criteria.sport === "padel" ? "padle" : criteria.sport);
    return (criteria.sport === "todos" || sports.some((sport) => normalize(sport).includes(selectedSport))) && (!criteria.query || text.includes(normalize(criteria.query))) && (!criteria.roofOnly || courts.some((court) => court.has_roof)) && (!criteria.lightingOnly || courts.some((court) => court.has_lighting));
  }).sort((left, right) => {
    if (userLocation) return distanceInKm(userLocation, left) - distanceInKm(userLocation, right);
    if (criteria.sort === "name") return left.name.localeCompare(right.name, "es");
    if (criteria.sort === "price") {
      const price = (item: SportComplexData) => Math.min(...(item.courts ?? []).map((court) => court.hourly_price).filter((value): value is number => typeof value === "number" && value > 0), Infinity);
      return price(left) - price(right);
    }
    return left.name.localeCompare(right.name, "es");
  }), [complexes, criteria, userLocation]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / RESULTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageComplexes = filtered.slice((safePage - 1) * RESULTS_PER_PAGE, safePage * RESULTS_PER_PAGE);

  useEffect(() => {
    if (selectedComplexId) document.getElementById(`complex-${selectedComplexId}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }, [selectedComplexId, safePage]);

  const selectComplex = (complex: SportComplexData) => {
    const index = filtered.findIndex((item) => item.id === complex.id);
    if (index >= 0) setCurrentPage(Math.floor(index / RESULTS_PER_PAGE) + 1);
    setSelectedComplexId(complex.id);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocationError("Tu navegador no permite compartir ubicación."); return; }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setUserLocation({ latitude: coords.latitude, longitude: coords.longitude }); setLocating(false); },
      () => { setLocationError("No pudimos obtener tu ubicación. Revisá el permiso del navegador e intentá de nuevo."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const goToNextPage = async () => {
    if (safePage < totalPages) { setCurrentPage(safePage + 1); return; }
    if (hasMore && !loadingMore) { await loadMore(); setCurrentPage(safePage + 1); }
  };

  return <><Helmet><title>Cancha Libre | Encontrá dónde jugar en Jujuy</title><meta name="description" content="Encontrá complejos deportivos en San Salvador de Jujuy." /><meta property="og:image" content="/hero-canchalibre-night.png" /></Helmet><div className="min-h-screen bg-background"><Header /><main>
    <section className="relative overflow-hidden bg-emerald-950 py-12 text-white md:py-16"><img src="/hero-canchalibre-night.png" alt="Cancha deportiva iluminada al anochecer" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-emerald-950/35" /><div className="container relative mx-auto px-4"><div className="max-w-[650px]"><p className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-200"><MapPin className="h-4 w-4" />Canchas y complejos en San Salvador de Jujuy</p><h1 className="text-5xl font-extrabold leading-[.95] tracking-tight md:text-6xl">Encontrá dónde <span className="text-emerald-300">jugar.</span></h1><p className="mt-5 max-w-[560px] text-base leading-relaxed text-white md:text-lg">Buscá un lugar, ubicá los complejos en el mapa y elegí el que mejor te queda.</p></div><div className="mt-8 max-w-6xl"><SearchIntentBar criteria={criteria} onChange={updateCriteria} onSearch={() => document.getElementById("mapa-complejos")?.scrollIntoView({ behavior: "smooth", block: "start" })} /></div></div></section>
    <section className="container mx-auto px-4 py-6"><SportRail selected={criteria.sport} onSelect={(sport) => updateCriteria({ sport })} /></section>
    <section id="results" className="container mx-auto scroll-mt-20 px-4 pb-12"><div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-bold tracking-tight">Explorá los complejos</h2><p className="mt-1 text-sm text-muted-foreground">Primero mirá el mapa; al seleccionar un marcador se destaca su tarjeta.</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant={userLocation ? "secondary" : "outline"} size="sm" onClick={useMyLocation} disabled={locating}><LocateFixed className="mr-2 h-4 w-4" />{locating ? "Buscando ubicación…" : userLocation ? "Ordenados por cercanía" : "Usar mi ubicación"}</Button>{userLocation && <Button type="button" variant="ghost" size="sm" onClick={() => { setUserLocation(null); setLocationError(null); }}>Quitar ubicación</Button>}</div></div>{locationError && <p role="status" className="mt-3 text-sm text-destructive">{locationError}</p>}<div className="mt-5"><ResultsToolbar count={filtered.length} criteria={criteria} onChange={updateCriteria} nearbyActive={Boolean(userLocation)} /></div>
      {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando complejos…</div> : error ? <Card className="mt-6"><CardContent className="p-8 text-center"><p className="font-medium">No pudimos cargar los complejos.</p><p className="mt-2 text-sm text-muted-foreground">Probá de nuevo en unos minutos.</p></CardContent></Card> : filtered.length === 0 ? <Card className="mt-6 border-dashed"><CardContent className="p-10 text-center"><Search className="mx-auto h-7 w-7 text-emerald-700" /><h3 className="mt-3 text-lg font-semibold">Todavía no encontramos complejos así</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Estamos sumando nuevos espacios. Probá ampliar la zona o quitar características.</p><Button className="mt-5" variant="outline" onClick={() => setParams({}, { replace: true })}><RotateCcw className="mr-2 h-4 w-4" />Limpiar búsqueda</Button></CardContent></Card> : <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,.8fr)]"><div id="mapa-complejos" className="order-1 scroll-mt-20 xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)]"><MapSection complexes={filtered} selectedComplexId={selectedComplexId} userLocation={userLocation} onSelectComplex={selectComplex} onViewDetails={(complex) => navigate(`/complex/${complex.id}`)} /></div><div className="order-2 rounded-2xl border bg-card p-3 shadow-sm"><div className="mb-3 flex items-center justify-between px-1"><h3 className="font-semibold">Listado de complejos</h3><span className="text-xs text-muted-foreground">Página {safePage} de {totalPages}{hasMore ? "+" : ""}</span></div><div className="space-y-2">{pageComplexes.map((complex) => <SportComplexCard key={complex.id} complex={complex} selected={complex.id === selectedComplexId} distanceKm={userLocation ? distanceInKm(userLocation, complex) : null} onSelect={selectComplex} onViewDetails={(item) => navigate(`/complex/${item.id}`)} />)}</div><nav className="mt-4 flex items-center justify-between gap-3 border-t pt-3" aria-label="Paginación de complejos"><Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1}><ArrowLeft className="mr-1.5 h-4 w-4" />Anterior</Button><span className="text-xs text-muted-foreground" aria-live="polite">Página {safePage}</span><Button type="button" variant="outline" size="sm" onClick={() => void goToNextPage()} disabled={loadingMore || (!hasMore && safePage === totalPages)}>Siguiente<ArrowRight className="ml-1.5 h-4 w-4" /></Button></nav>{loadingMore && <div className="flex justify-center py-3 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando página…</div>}</div></div>}
    </section>
    <section className="container mx-auto grid gap-4 px-4 pb-10 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border bg-card p-6 text-center"><h2 className="text-xl font-bold">Encontrá una cancha en pocos pasos</h2><div className="mt-6 grid gap-5 sm:grid-cols-3"><div><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Search className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-bold">1. Elegí tus preferencias</h3><p className="mt-1 text-xs text-muted-foreground">Seleccioná deporte, zona, fecha y horario aproximado.</p></div><div><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Building2 className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-bold">2. Ubicate en el mapa</h3><p className="mt-1 text-xs text-muted-foreground">Compará distancias y elegí el complejo que te conviene.</p></div><div><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><MessageCircle className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-bold">3. Contactá al complejo</h3><p className="mt-1 text-xs text-muted-foreground">Consultá disponibilidad y confirmá el turno.</p></div></div></div><div className="rounded-2xl bg-emerald-50 p-6 dark:bg-emerald-950/40"><h2 className="text-xl font-bold">¿Tenés un complejo deportivo?</h2><p className="mt-2 max-w-sm text-sm text-foreground/80">Publicá tus canchas, horarios, ubicación y medios de contacto para que más jugadores puedan encontrarte.</p><Button asChild className="mt-5 bg-emerald-700 text-white hover:bg-emerald-800"><a href="/owners/auth">Publicá tu complejo <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div></section>
  </main><footer className="bg-emerald-950 text-white"><div className="container mx-auto grid gap-7 px-4 py-9 text-sm md:grid-cols-4"><div><p className="font-bold">Cancha Libre</p><p className="text-xs text-emerald-100">San Salvador de Jujuy</p><p className="mt-4 text-xs text-white/75">Una plataforma para conectar jugadores con complejos deportivos de la ciudad.</p></div><div><p className="font-semibold">Explorar</p><a className="mt-3 block text-xs text-white/75 hover:text-white" href="#results">Encontrar complejos</a><a className="mt-2 block text-xs text-white/75 hover:text-white" href="/owners/auth">Publicá tu complejo</a></div><div><p className="font-semibold">Información</p><a className="mt-3 block text-xs text-white/75 hover:text-white" href="/terms-of-service">Términos y condiciones</a><a className="mt-2 block text-xs text-white/75 hover:text-white" href="/privacy-policy">Política de privacidad</a></div><div><p className="font-semibold">Contacto</p><a className="mt-3 block text-xs text-white/75 hover:text-white" href="mailto:hola@canchalibre.com.ar">hola@canchalibre.com.ar</a></div></div></footer></div></>;
}
