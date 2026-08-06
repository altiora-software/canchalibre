import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, MapPin, Users, Zap, Home } from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { usePublicComplex } from '@/hooks/useComplexes';
import { useToast } from '@/hooks/use-toast';

const currency = (value: number | null | undefined) => value && value > 0
  ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
  : 'Precio a confirmar';

const ComplexDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { complex, loading, error } = usePublicComplex(id);
  const [isBookingOpen, setBookingOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const startBooking = () => {
    if (!user) {
      toast({ title: 'Iniciá sesión para reservar', description: 'Necesitás una cuenta para enviar una solicitud de reserva.' });
      navigate('/auth');
      return;
    }
    setBookingOpen(true);
  };

  if (loading) {
    return <main className="min-h-screen bg-background px-4 py-8" aria-busy="true"><div className="mx-auto max-w-6xl animate-pulse space-y-6"><div className="h-[22rem] rounded-3xl bg-muted" /><div className="h-10 w-2/3 rounded bg-muted" /><div className="h-32 rounded-2xl bg-muted" /></div></main>;
  }

  if (!complex) {
    return <main className="grid min-h-screen place-items-center bg-background px-4"><section className="max-w-md text-center"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Cancha Libre</p><h1 className="text-3xl font-bold">Complejo no disponible</h1><p className="mt-3 text-muted-foreground">{error ? 'No pudimos cargar este complejo. Probá nuevamente.' : 'El complejo que buscás no existe o dejó de estar disponible.'}</p><Button className="mt-6 min-h-11" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" />Volver a explorar</Button></section></main>;
  }

  const images = complex.photos.filter(Boolean);
  const courts = complex.courts?.filter((court) => court.is_active !== false) ?? [];
  const sports = [...new Set([...courts.map((court) => court.sport), ...complex.catalog_sports].filter(Boolean))];
  const lowestPrice = courts.reduce<number | null>((lowest, court) => court.hourly_price && court.hourly_price > 0 && (lowest === null || court.hourly_price < lowest) ? court.hourly_price : lowest, null);
  const hasCoordinates = typeof complex.latitude === 'number' && typeof complex.longitude === 'number';
  const currentImage = images[imageIndex] ?? null;

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" className="min-h-11" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" />Explorar</Button>
          <Button className="min-h-11" onClick={startBooking} disabled={!courts.length}><Calendar className="mr-2 h-4 w-4" />Reservar cancha</Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:py-10">
        <section aria-label="Galería del complejo" className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          {currentImage ? <img src={currentImage} alt={`${complex.name}${images.length > 1 ? ` — foto ${imageIndex + 1}` : ''}`} className="h-[18rem] w-full object-cover sm:h-[28rem]" /> : <div className="flex h-[18rem] items-end bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/.32),transparent_30%),linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--primary)))] p-6 sm:h-[28rem]"><div className="max-w-md text-primary-foreground"><p className="text-sm font-semibold uppercase tracking-[.18em] opacity-85">Cancha Libre</p><p className="mt-2 text-2xl font-bold">{sports[0] ?? 'Deporte'} en {complex.neighborhood ?? 'tu zona'}</p><p className="mt-2 text-sm opacity-90">Este complejo todavía no publicó fotos.</p></div></div>}
          {images.length > 1 && <><Button type="button" variant="secondary" size="icon" className="absolute left-4 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-full" onClick={() => setImageIndex((index) => (index - 1 + images.length) % images.length)} aria-label="Ver foto anterior"><ChevronLeft /></Button><Button type="button" variant="secondary" size="icon" className="absolute right-4 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-full" onClick={() => setImageIndex((index) => (index + 1) % images.length)} aria-label="Ver foto siguiente"><ChevronRight /></Button><p className="absolute bottom-4 right-4 rounded-full bg-background/90 px-3 py-1 text-sm font-medium text-foreground">{imageIndex + 1} de {images.length}</p></>}
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-8">
            <section aria-labelledby="complex-title"><div className="flex flex-wrap items-center gap-3"><p className="text-sm font-semibold uppercase tracking-[.14em] text-primary">{complex.neighborhood ?? 'Complejo deportivo'}</p>{complex.is_active && courts.length > 0 && <Badge className="bg-primary text-primary-foreground">Reservas disponibles</Badge>}</div><h1 id="complex-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">{complex.name}</h1><div className="mt-4 flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-5 w-5 shrink-0" /><span>{complex.address}{complex.neighborhood ? `, ${complex.neighborhood}` : ''}</span></div>{complex.description && <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{complex.description}</p>}</section>

            {sports.length > 0 && <section aria-labelledby="sports-heading"><h2 id="sports-heading" className="text-xl font-bold">Qué podés jugar</h2><div className="mt-3 flex flex-wrap gap-2">{sports.map((sport) => <Badge key={sport} variant="outline" className="min-h-9 rounded-full px-3 text-sm">{sport}</Badge>)}</div></section>}

            <section aria-labelledby="courts-heading"><div className="flex items-baseline justify-between gap-4"><div><h2 id="courts-heading" className="text-2xl font-bold">Canchas</h2><p className="mt-1 text-muted-foreground">Elegí una al iniciar tu reserva.</p></div><span className="text-sm font-medium text-muted-foreground">{courts.length} {courts.length === 1 ? 'opción' : 'opciones'}</span></div>{courts.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{courts.map((court) => <Card key={court.id} className="overflow-hidden border-border shadow-none"><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{court.name}</h3><p className="mt-1 text-sm text-muted-foreground">{court.sport}</p></div><span className="text-right text-sm font-semibold">{currency(court.hourly_price)}<span className="block text-xs font-normal text-muted-foreground">precio publicado/hora</span></span></div><ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground"><li className="flex items-center gap-1.5"><Users className="h-4 w-4" />{court.players_capacity} jugadores</li>{court.has_lighting && <li className="flex items-center gap-1.5"><Zap className="h-4 w-4" />Iluminación</li>}{court.has_roof && <li className="flex items-center gap-1.5"><Home className="h-4 w-4" />Techada</li>}{court.surface_type && <li>{court.surface_type}</li>}</ul></CardContent></Card>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/35 p-6"><h3 className="font-semibold">Todavía no hay canchas publicadas</h3><p className="mt-1 text-sm text-muted-foreground">Este complejo no tiene opciones disponibles para reservar desde la plataforma.</p></div>}</section>

            {complex.amenities.length > 0 && <section aria-labelledby="amenities-heading"><h2 id="amenities-heading" className="text-xl font-bold">Servicios</h2><ul className="mt-3 flex flex-wrap gap-2">{complex.amenities.map((amenity) => <li key={amenity} className="rounded-full border border-border bg-card px-3 py-2 text-sm">{amenity}</li>)}</ul></section>}
          </div>

          <aside className="lg:sticky lg:top-20"><Card className="border-primary/25 shadow-card"><CardContent className="space-y-5 p-6"><div><p className="text-sm font-medium text-muted-foreground">{lowestPrice ? 'Precio publicado desde' : 'Reserva online'}</p><p className="mt-1 text-2xl font-bold">{lowestPrice ? `${currency(lowestPrice)} / hora` : 'Elegí tu cancha'}</p><p className="mt-2 text-sm text-muted-foreground">La disponibilidad, el importe final y cualquier seña se confirman al enviar tu solicitud.</p></div><Button className="min-h-12 w-full text-base" onClick={startBooking} disabled={!courts.length}><Calendar className="mr-2 h-5 w-5" />Reservar cancha</Button>{!courts.length && <p className="text-center text-sm text-muted-foreground">No hay canchas disponibles para reservar.</p>}{hasCoordinates && <Button asChild variant="outline" className="min-h-11 w-full"><a href={`https://www.openstreetmap.org/?mlat=${complex.latitude}&mlon=${complex.longitude}#map=16/${complex.latitude}/${complex.longitude}`} target="_blank" rel="noreferrer"><MapPin className="mr-2 h-4 w-4" />Ver ubicación</a></Button>}<p className="text-center text-xs text-muted-foreground">No se muestra ni solicita información de contacto personal.</p></CardContent></Card></aside>
        </div>
      </div>
      <BookingModal complex={complex} isOpen={isBookingOpen} onClose={() => setBookingOpen(false)} />
    </main>
  );
};

export default ComplexDetails;
