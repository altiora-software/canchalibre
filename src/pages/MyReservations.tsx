import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { useAuth } from "@/hooks/useAuth";
import { useReservations } from "@/hooks/useReservations";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";

import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Home,
  CalendarDays,
} from "lucide-react";

type Row = {
  id: string;
  reservation_date: string;      // "YYYY-MM-DD"
  start_time: string;            // "HH:mm:ss"
  end_time: string;              // "HH:mm:ss"
  total_price: number | null;
  payment_method: string | null;
  payment_status: string | null;
  deposit_amount: number | null;
  deposit_paid: boolean | null;
  notes?: string | null;
  sport_courts?: { name: string; sport: string } | null;
  sport_complexes?: { name: string; address?: string; phone?: string; whatsapp?: string } | null;
  complex_id?: string;           // por si lo necesitas
};

const MyReservations = () => {
  const { user } = useAuth();
  const { reservations, loading, error } = useReservations();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  // ---------------- helpers ----------------
  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-green-500/10 text-green-700 border-green-200">Confirmada</Badge>;
      case "paid":      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200">Pagada</Badge>;
      case "pending":   return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case "cancelled": return <Badge className="bg-red-500/10 text-red-700 border-red-200">Cancelada</Badge>;
      default:          return <Badge className="bg-gray-500/10 text-gray-700 border-gray-200">{status || "—"}</Badge>;
    }
  };

  const paymentLabel = (method?: string | null) => {
    switch (method) {
      case "mercado_pago": return "Mercado Pago";
      case "transfer":     return "Transferencia";
      case "cash":         return "Efectivo";
      default:             return method || "—";
    }
  };

  const waContact = (r: Row) => {
    const msg = `Hola! Consulto por mi reserva del ${format(new Date(r.reservation_date), "dd/MM/yyyy", { locale: es })} de ${r.start_time.slice(0,5)} a ${r.end_time.slice(0,5)} en ${r.sport_complexes?.name ?? "el complejo"}.`;
    const raw = r.sport_complexes?.whatsapp || r.sport_complexes?.phone;
    if (!raw) return;
    const digits = raw.replace(/\D/g, "");
    // Si el número ya tiene cod país, no le anteponemos 54; si no, puedes ajustarlo a tu criterio:
    const full = digits.startsWith("54") ? digits : `54${digits}`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // -------- agrupar por complejo (tabla por complejo) --------
  const groupedByComplex = useMemo(() => {
    // key: complex name (si necesitas usar ID, reemplaza por r.sport_complexes?.id)
    const map = new Map<string, { complexName: string; address?: string; phone?: string; whatsapp?: string; rows: Row[] }>();

    (reservations as Row[]).forEach((r) => {
      console.log('res', r);

      const key = r.sport_complexes?.name || "Complejo";
      const entry = map.get(key) ?? {
        complexName: r.sport_complexes?.name || "Complejo",
        address: r.sport_complexes?.address,
        phone: r.sport_complexes?.phone,
        whatsapp: r.sport_complexes?.whatsapp,
        rows: [],
      };
      entry.rows.push(r);
      map.set(key, entry);
    });

    // ordenar cada grupo por fecha desc y hora asc
    Array.from(map.values()).forEach((g) => {
      g.rows.sort((a, b) => {
        const dA = new Date(a.reservation_date).getTime();
        const dB = new Date(b.reservation_date).getTime();
        if (dA !== dB) return dB - dA; // fecha desc
        return a.start_time.localeCompare(b.start_time); // hora asc
      });
    });

    // ordenar grupos por nombre
    return Array.from(map.values()).sort((a, b) => a.complexName.localeCompare(b.complexName));
  }, [reservations]);

  // ---------------- loading / empty ----------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando reservas…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mis Reservas — Cancha Libre</title>
        <meta name="description" content="Revisa y gestiona tus reservas, agrupadas por complejo deportivo." />
      </Helmet>

      {/* NAVBAR (mobile-first) */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Home className="w-5 h-5" />
            Cancha Libre
          </Link>
          <nav className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link to="/"><Home className="w-4 h-4 mr-2" />Explorar</Link>
            </Button>
            <Button variant="secondary" size="sm" className="flex items-center">
              <CalendarDays className="w-4 h-4 mr-2" /> Mis reservas
            </Button>
          </nav>
        </div>
      </header>

      {/* CONTENT */}
      <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold">Mis Reservas</h1>
              <p className="text-muted-foreground mt-1">Agrupadas por complejo para que encuentres todo más rápido.</p>
            </div>

            {error && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <p className="text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {(!reservations || reservations.length === 0) ? (
              <Card className="text-center">
                <CardContent className="pt-8 pb-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tenés reservas todavía</h3>
                  <p className="text-muted-foreground mb-4">Buscá un complejo y reservá tu próximo turno.</p>
                  <Button asChild className="bg-gradient-sport">
                    <Link to="/">Explorar canchas</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              groupedByComplex.map((group) => (
                <Card key={group.complexName} className="shadow-card-custom">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg sm:text-xl">{group.complexName}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {group.address || "—"}
                        </CardDescription>
                      </div>
                      {/* Acciones del complejo (WhatsApp / Llamar) */}
                      <div className="flex gap-2">
                        {(group.whatsapp || group.phone) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              waContact({
                                // simulamos una row mínima para usar la misma función
                                id: "wa",
                                reservation_date: new Date().toISOString().slice(0, 10),
                                start_time: "00:00:00",
                                end_time: "00:00:00",
                                total_price: null,
                                payment_method: null,
                                payment_status: null,
                                deposit_amount: null,
                                deposit_paid: null,
                                sport_courts: null,
                                sport_complexes: {
                                  name: group.complexName,
                                  address: group.address,
                                  phone: group.phone,
                                  whatsapp: group.whatsapp,
                                },
                              } as Row)
                            }
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                          </Button>
                        )}
                        {group.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${group.phone}`, "_self")}
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Llamar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                      {group.rows.map((r) => (
                        <Card key={r.id} className="border">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {format(new Date(r.reservation_date), "EEE dd MMM yyyy", { locale: es })}
                              </span>
                              {getStatusBadge(r.payment_status)}
                            </div>
                            <div className="text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4 text-primary" />
                              {r.start_time.slice(0,5)} – {r.end_time.slice(0,5)}
                            </div>
                            <div className="text-sm">🏟️ {r.sport_courts?.name} ({r.sport_courts?.sport})</div>
                            <div className="text-sm">💳 {paymentLabel(r.payment_method)}</div>
                            <div className="text-sm">
                              <span className="font-medium">Total:</span> {r.total_price ? `$${r.total_price}` : "—"}
                            </div>
                            {!!r.deposit_amount && (
                              <div className="text-sm">
                                💰 Seña: ${r.deposit_amount} {r.deposit_paid ? "(pagada)" : "(pendiente)"}
                              </div>
                            )}
                            {r.notes && (
                              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                                <strong>Notas:</strong> {r.notes}
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              {(group.whatsapp || group.phone) && (
                                <Button variant="outline" size="sm" onClick={() => waContact(r)}>
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  WhatsApp
                                </Button>
                              )}
                              {group.phone && (
                                <Button variant="outline" size="sm" onClick={() => window.open(`tel:${group.phone}`, "_self")}>
                                  <Phone className="w-4 h-4 mr-2" />
                                  Llamar
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Horario</TableHead>
                            <TableHead>Cancha</TableHead>
                            <TableHead>Deporte</TableHead>
                            <TableHead>Pago</TableHead>
                            <TableHead>Importe</TableHead>
                            <TableHead className="text-right">Estado / Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.rows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>
                                {format(new Date(r.reservation_date), "dd/MM/yyyy", { locale: es })}
                              </TableCell>
                              <TableCell>{r.start_time.slice(0,5)} – {r.end_time.slice(0,5)}</TableCell>
                              <TableCell>{r.sport_courts?.name}</TableCell>
                              <TableCell>{r.sport_courts?.sport}</TableCell>
                              <TableCell>{paymentLabel(r.payment_method)}</TableCell>
                              <TableCell>{r.total_price ? `$${r.total_price}` : "—"}</TableCell>
                              <TableCell className="flex items-center gap-2 justify-end">
                                {getStatusBadge(r.payment_status)}
                                {(group.whatsapp || group.phone) && (
                                  <Button variant="outline" size="sm" onClick={() => waContact(r)}>
                                    <MessageCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                {group.phone && (
                                  <Button variant="outline" size="sm" onClick={() => window.open(`tel:${group.phone}`, "_self")}>
                                    <Phone className="w-4 h-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default MyReservations;
