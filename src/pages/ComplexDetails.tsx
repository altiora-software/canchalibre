import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Clock, 
  Star, 
  Phone, 
  MessageCircle, 
  Calendar,
  Users,
  Zap,
  Home,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { SportComplexData, useComplexes } from "@/hooks/useComplexes";
import { useAuth } from "@/hooks/useAuth";
import BookingModal from "@/components/BookingModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ComplexDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { complexes, loading } = useComplexes();
  const [complex, setComplex] = useState<SportComplexData | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (complexes.length > 0 && id) {
      const foundComplex = complexes.find(c => c.id === id);
      if (foundComplex) {
        setComplex(foundComplex);
      } else {
        navigate('/');
        toast({
          title: "Complejo no encontrado",
          description: "El complejo deportivo que buscas no existe o no está disponible.",
          variant: "destructive"
        });
      }
    }
  }, [complexes, id, navigate, toast]);

  const handleBooking = () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para hacer una reserva",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    setShowBookingModal(true);
  };

  function useComplexById(id?: string) {
    const { complexes } = useComplexes();
    const [complex, setComplex] = useState<SportComplexData|null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      let cancelled = false;
      (async () => {
        if (!id) return;
        const cached = complexes.find(c => c.id === id);
        if (cached) { setComplex(cached); setLoading(false); return; }
  
        const { data } = await supabase
          .from("sport_complexes")
          .select(`*, sport_courts (*)`)
          .eq("id", id)
          .maybeSingle();
  
        if (!cancelled) {
          setComplex(data ? { ...data, courts: data.sport_courts ?? [] } : null);
          setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [id, complexes]);
  
    return { complex, loading };
  }
  

  const handleWhatsAppContact = () => {
    if (!complex) return;
    const message = encodeURIComponent(
      `Hola! Me interesa reservar una cancha en ${complex.name}. ¿Podrían darme más información?`
    );
    const whatsappNumber = complex.whatsapp?.replace(/[^\d]/g, '') || complex.phone?.replace(/[^\d]/g, '');
    if (whatsappNumber) {
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-64 bg-muted rounded-lg mb-6"></div>
            <div className="h-8 bg-muted rounded mb-4 w-1/2"></div>
            <div className="h-4 bg-muted rounded mb-2 w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!complex) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Complejo no encontrado</h2>
          <p className="text-muted-foreground mb-4">El complejo que buscas no existe o no está disponible.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const images = complex.photos && complex.photos.length > 0 ? complex.photos : ["/placeholder.svg"];
  const sports = complex.courts?.map(court => court.sport) || [];
  const uniqueSports = [...new Set(sports)];
  const rating = 4.5; // Placeholder
  const reviewCount = 12; // Placeholder

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppContact}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contactar
              </Button>
              <Button
                size="sm"
                onClick={handleBooking}
                className="bg-primary hover:bg-primary/90"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Reservar Ahora
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-64 md:h-80">
          <div className="md:col-span-2 lg:col-span-2">
            <img
              src={images[selectedImageIndex]}
              alt={complex.name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="space-y-2 hidden md:block">
            {images.slice(1, 3).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${complex.name} ${index + 2}`}
                className="w-full h-[calc(50%-4px)] object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedImageIndex(index + 1)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">{complex.name}</h1>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{complex.neighborhood}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span>{rating}</span>
                      <span>({reviewCount} reseñas)</span>
                    </div>
                  </div>
                </div>
                <Badge variant={complex.is_active ? "default" : "secondary"} className={
                  complex.is_active ? "bg-green-500 text-white" : "bg-red-500 text-white"
                }>
                  {complex.is_active ? "Abierto" : "Cerrado"}
                </Badge>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {complex.address}
              </p>
            </div>

            {/* Sports Available */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Deportes disponibles</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueSports.map((sport) => (
                  <Badge key={sport} variant="outline" className="px-3 py-1">
                    {sport}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Courts */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Canchas disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complex.courts?.map((court) => (
                  <Card key={court.id} className="border border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{court.name}</CardTitle>
                        <Badge variant="secondary">{court.sport}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{court.players_capacity} jugadores</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {court.has_lighting ? (
                            <Zap className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <Zap className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span>{court.has_lighting ? "Con iluminación" : "Sin iluminación"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {court.has_roof ? (
                            <Home className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Home className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span>{court.has_roof ? "Techada" : "Al aire libre"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${court.hourly_price || 2000}/hora</span>
                        </div>
                      </div>
                      {court.surface_type && (
                        <p className="text-sm text-muted-foreground">
                          Superficie: {court.surface_type}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {complex.amenities && complex.amenities.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Servicios incluidos</h3>
                <div className="flex flex-wrap gap-2">
                  {complex.amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline" className="bg-accent/50">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Booking Card */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Hacer reserva
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleBooking} className="w-full" size="lg">
                  Reservar cancha
                </Button>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>Horarios: 9:00 - 22:00</span>
                  </div>
                  <p className="text-muted-foreground">
                    Reservas hasta 30 días de anticipación
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Información de contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {complex.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{complex.phone}</span>
                  </div>
                )}
                {complex.whatsapp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWhatsAppContact}
                    className="w-full"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contactar por WhatsApp
                  </Button>
                )}
                {complex.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(complex.website, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Sitio web
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card>
              <CardHeader>
                <CardTitle>Ubicación</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{complex.address}</p>
                <Button variant="outline" size="sm" className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Ver en el mapa
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          complex={complex}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
};

export default ComplexDetails;