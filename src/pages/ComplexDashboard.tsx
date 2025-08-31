import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CalendarRange, BarChart3, DollarSign, Percent, MapPin, Plus, Search
} from "lucide-react";

type Complex = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  is_active: boolean;
};

type Court = {
  id: string;
  complex_id: string;
  name: string;
  sport: string | null;
  hourly_price: number | null;
  is_active: boolean;
};

type Reservation = {
  id: string;
  user_id: string | null;
  complex_id: string;
  court_id: string;
  reservation_date: string; // date
  start_time: string;       // time
  end_time: string;         // time
  total_price: number | null;
  payment_status: string | null;
  created_at: string;
};

type Tx = {
  id: string;
  reservation_id: string | null;
  amount: number | null;
  payment_method: string | null;
  status: string | null;
  created_at: string;
};

const startOfDayISO = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x.toISOString();
};
const endOfDayISO = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(23,59,59,999);
  return x.toISOString();
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n*24*3600*1000);

export default function ComplexDashboard() {
  const { id } = useParams(); // complex id
  const navigate = useNavigate();

  const [complex, setComplex] = useState<Complex | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  // filtros fecha (últimos 30 días por defecto)
  const [from, setFrom] = useState(() => startOfDayISO(addDays(new Date(), -29)));
  const [to, setTo] = useState(() => endOfDayISO(new Date()));
  const [q, setQ] = useState(""); // búsqueda en reservas

  // proteger ruta + cargar data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);

      // 1) asegurar que el complejo sea del owner logueado
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) {
        navigate("/owners/auth");
        return;
      }

      const { data: cpx, error: cErr } = await supabase
        .from("sport_complexes")
        .select("*")
        .eq("id", id)
        .single();

      if (cErr || !cpx) { navigate("/dashboard"); return; }
      if (cpx.owner_id !== uid) { navigate("/dashboard"); return; }

      // 2) paralelizar cargas
      const [courtsRes, resvRes, txRes] = await Promise.all([
        supabase.from("sport_courts").select("*").eq("complex_id", id).order("name", { ascending: true }),
        supabase.from("reservations")
          .select("*")
          .eq("complex_id", id)
          .gte("reservation_date", from.slice(0,10)) // reservation_date es date
          .lte("reservation_date", to.slice(0,10))
          .order("reservation_date", { ascending: false })
          .order("start_time", { ascending: false }),
        supabase.from("payment_transactions")
          .select("*")
          .in("reservation_id", supabase.rpc ? [] : []) // noop si no hay RPC; igual traemos todas y filtramos abajo
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      setComplex(cpx as any);
      setCourts((courtsRes.data || []) as Court[]);
      // si no querés todas las txs, podés luego filtrar por reservas
      setReservations((resvRes.data || []) as Reservation[]);
      setTxs((txRes.data || []) as Tx[]);

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [id, from, to, navigate]);

  // KPIs
  const kpis = useMemo(() => {
    const resv = reservations;
    const count = resv.length;

    const hoursBooked = resv.reduce((acc, r) => {
      // diferencia simple hh:mm en horas
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      const h = (eh + em/60) - (sh + sm/60);
      return acc + Math.max(0, h);
    }, 0);

    const revenue = resv.reduce((a,r)=> a + (r.total_price || 0), 0);

    const courtCount = courts.length || 1;
    const days = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime())/86400000));
    // asumiendo 12 horas operativas por día por cancha (ajustar a tu realidad)
    const totalSlots = courtCount * days * 12;
    const utilization = totalSlots ? Math.min(100, Math.round((hoursBooked / totalSlots) * 100)) : 0;

    return { count, hoursBooked, revenue, utilization };
  }, [reservations, courts, from, to]);

  const filteredReservations = useMemo(() => {
    if (!q) return reservations;
    const s = q.toLowerCase();
    return reservations.filter(r =>
      r.payment_status?.toLowerCase().includes(s) ||
      r.total_price?.toString().includes(s) ||
      r.reservation_date?.toString().includes(s)
    );
  }, [q, reservations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Cargando…
      </div>
    );
  }

  if (!complex) return null;

  return (
    <>
      <Helmet>
        <title>{complex.name} – Gestión del Complejo</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-white sticky top-0 z-30">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">{complex.name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {complex.address}
                <Badge variant={complex.is_active ? "default" : "secondary"}>
                  {complex.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/dashboard">Volver</Link>
              </Button>
              <Button asChild className="bg-gradient-sport">
                <Link to={`/register-court?complex_id=${complex.id}`}>
                  <Plus className="w-4 h-4 mr-1" /> Nueva cancha
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          {/* Filtros de fecha */}
          <Card className="mb-6">
            <CardContent className="py-4 grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="col-span-2">
                <Label>Desde</Label>
                <Input type="date"
                  value={from.slice(0,10)}
                  onChange={(e)=>setFrom(startOfDayISO(new Date(e.target.value)))}/>
              </div>
              <div className="col-span-2">
                <Label>Hasta</Label>
                <Input type="date"
                  value={to.slice(0,10)}
                  onChange={(e)=>setTo(endOfDayISO(new Date(e.target.value)))}/>
              </div>
              <div className="col-span-1">
                <Label>Búsqueda</Label>
                <div className="relative">
                  <Input placeholder="reservas…" value={q} onChange={(e)=>setQ(e.target.value)} />
                  <Search className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="reservations">Reservas</TabsTrigger>
              <TabsTrigger value="courts">Canchas</TabsTrigger>
              <TabsTrigger value="finance">Finanzas</TabsTrigger>
              <TabsTrigger value="settings">Config.</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarRange className="w-4 h-4" /> Reservas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{kpis.count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Horas reservadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{kpis.hoursBooked.toFixed(1)} h</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Ingresos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">${kpis.revenue.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Percent className="w-4 h-4" /> Ocupación (aprox.)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{kpis.utilization}%</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reservations */}
            <TabsContent value="reservations">
              <Card>
                <CardHeader>
                  <CardTitle>Reservas ({filteredReservations.length})</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2">Fecha</th>
                        <th>Horario</th>
                        <th>Cancha</th>
                        <th>Estado pago</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReservations.map((r) => {
                        const courtName = courts.find(c=>c.id===r.court_id)?.name || "—";
                        return (
                          <tr key={r.id} className="border-t">
                            <td className="py-2">{r.reservation_date}</td>
                            <td>{r.start_time.slice(0,5)}–{r.end_time.slice(0,5)}</td>
                            <td>{courtName}</td>
                            <td>
                              <Badge variant={r.payment_status === "paid" ? "default" : "secondary"}>
                                {r.payment_status || "pendiente"}
                              </Badge>
                            </td>
                            <td className="text-right">${(r.total_price || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      {filteredReservations.length === 0 && (
                        <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sin reservas en el rango seleccionado</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Courts */}
            <TabsContent value="courts">
              <Card>
                <CardHeader>
                  <CardTitle>Canchas ({courts.length})</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  {courts.map(c => (
                    <Card key={c.id} className="border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{c.name}</CardTitle>
                          <Badge variant={c.is_active ? "default" : "secondary"}>
                            {c.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        <div>Deporte: {c.sport || "—"}</div>
                        <div>Precio/hora: ${c.hourly_price?.toLocaleString() || "—"}</div>
                      </CardContent>
                    </Card>
                  ))}
                  {courts.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No hay canchas aún. <Link className="text-primary underline" to={`/register-court?complex_id=${complex.id}`}>Crear cancha</Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Finance */}
            <TabsContent value="finance">
              <Card>
                <CardHeader>
                  <CardTitle>Finanzas</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2">Fecha</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th className="text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txs
                        .filter(t => t.amount != null)
                        .map(t => (
                          <tr key={t.id} className="border-t">
                            <td className="py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                            <td>{t.payment_method || "—"}</td>
                            <td>
                              <Badge variant={t.status === "paid" ? "default" : "secondary"}>
                                {t.status || "—"}
                              </Badge>
                            </td>
                            <td className="text-right">${(t.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      {txs.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Sin movimientos</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings">
              <Card>
                <CardHeader><CardTitle>Configuración</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>Acá podés editar datos del complejo, horarios de apertura, amenities y publicación.</div>
                  <Button variant="outline" asChild><Link to={`/complex/${complex.id}/edit`}>Editar complejo</Link></Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
