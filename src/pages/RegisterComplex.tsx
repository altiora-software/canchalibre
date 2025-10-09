// src/pages/RegisterComplex.tsx  (o donde esté tu componente)
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// ... (otros imports como antes)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { MapPin, Phone, Plus, Trash2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

type SportType = "futbol" | "basquet" | "tenis" | "voley" | "handball" | "skate" | "padle";

interface Court {
  name: string;
  sport: SportType;
  playersCapacity: number;
  surfaceType: string;
  hasLighting: boolean;
  hasRoof: boolean;
  hourlyPrice: number;
}

const RegisterComplex = () => {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    neighborhood: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    amenities: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // courts + helpers (igual que antes)
  const [courts, setCourts] = useState<Court[]>([]);
  const [currentCourt, setCurrentCourt] = useState<Court>({
    name: "",
    sport: "futbol",
    playersCapacity: 5,
    surfaceType: "",
    hasLighting: false,
    hasRoof: false,
    hourlyPrice: 0,
  });

  const sports = [
    { value: "futbol", label: "Fútbol" },
    { value: "basquet", label: "Básquet" },
    { value: "tenis", label: "Tenis" },
    { value: "voley", label: "Vóley" },
    { value: "handball", label: "Handball" },
    { value: "skate", label: "Skate" },
    { value: "padle", label: "Padle" },
  ];

  const amenitiesOptions = [
    "Estacionamiento",
    "Vestuarios",
    "Duchas",
    "Cancha techada",
    "Iluminación",
    "Cantina/Bar",
    "Parrilla",
    "WiFi",
    "Aire acondicionado",
    "Sonido",
  ];

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isOwner) {
        navigate("/");
      }
    }
  }, [user, authLoading, profileLoading, isOwner, navigate]);

  const addCourt = () => { /* igual que antes */ 
    if (!currentCourt.name || !currentCourt.sport) {
      toast({ title: "Error", description: "Completa todos los campos de la cancha", variant: "destructive" });
      return;
    }
    setCourts([...courts, currentCourt]);
    setCurrentCourt({
      name: "",
      sport: "futbol",
      playersCapacity: 5,
      surfaceType: "",
      hasLighting: false,
      hasRoof: false,
      hourlyPrice: 0,
    });
  };

  const removeCourt = (index: number) => setCourts(courts.filter((_, i) => i !== index));
  const handleAmenityChange = (amenity: string, checked: boolean) => {
    if (checked) setFormData({ ...formData, amenities: [...formData.amenities, amenity] });
    else setFormData({ ...formData, amenities: formData.amenities.filter(a => a !== amenity) });
  };

  // -------------------------
  // Places Autocomplete setup
  // -------------------------
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions
  } = usePlacesAutocomplete({
    debounce: 300,
    requestOptions: {
      componentRestrictions: { country: "ar" } // restringe a Argentina
    }
  });

  const handleSelectAddress = async (address: string) => {
    try {
      setValue(address, false);
      clearSuggestions();
      // obtiene geocode y latlng
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      setFormData({ ...formData, address, latitude: lat, longitude: lng });
    } catch (err) {
      console.error("Error geocoding:", err);
      toast({ title: "Error", description: "No se pudo obtener la ubicación exacta.", variant: "destructive" });
    }
  };

  // -------------------------
  // Submit (incluir lat/lng)
  // -------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOwner) return;

    if (courts.length === 0) {
      toast({ title: "Error", description: "Agrega al menos una cancha", variant: "destructive" });
      return;
    }

    if (!formData.address || formData.latitude === null || formData.longitude === null) {
      toast({ title: "Error", description: "Seleccioná una dirección válida desde las sugerencias.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // perfil (igual que antes)
      let { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            role: 'owner',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            email: user.email || ''
          })
          .select('id')
          .single();
        if (createError) throw createError;
        profile = newProfile;
      }

      // Create complex including latitude & longitude
      const { data: complex, error: complexError } = await supabase
        .from('sport_complexes')
        .insert({
          owner_id: profile.id,
          name: formData.name,
          description: formData.description,
          address: formData.address,
          neighborhood: formData.neighborhood,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          email: formData.email,
          website: formData.website,
          amenities: formData.amenities,
          is_active: true,
          is_approved: false,
          latitude: formData.latitude,
          longitude: formData.longitude,
        })
        .select()
        .single();

      if (complexError) throw complexError;

      const courtsData = courts.map(court => ({
        complex_id: complex.id,
        name: court.name,
        sport: court.sport,
        players_capacity: court.playersCapacity,
        surface_type: court.surfaceType,
        has_lighting: court.hasLighting,
        has_roof: court.hasRoof,
        hourly_price: court.hourlyPrice,
      }));

      const { error: courtsError } = await supabase.from('sport_courts').insert(courtsData);
      if (courtsError) throw courtsError;

      toast({ title: "¡Complejo registrado!", description: "Tu complejo está en revisión. Te contactaremos por WhatsApp para activarlo." });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Ocurrió un error.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || profileLoading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) { navigate('/auth'); return null; }
  if (!isOwner) { navigate('/'); return null; }

  return (
    <>
      <Helmet>
        <title>Registrar Complejo - Cancha Libre</title>
      </Helmet>

      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">Registra tu Complejo Deportivo</h1>
            <p className="text-xl text-muted-foreground">Únete a la plataforma líder en Jujuy</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Información del Complejo</CardTitle>
                <CardDescription>Datos principales de tu complejo deportivo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre del Complejo *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Complejo Deportivo San Martín" required />
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Barrio</Label>
                    <Input id="neighborhood" value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} placeholder="Ej: Alto Comedero" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Dirección *</Label>
                  <div className="relative">
                    <Input
                      id="address"
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value);
                        // keep formData.address in sync only if user manual types AND we don't yet have lat/lng
                        setFormData({ ...formData, address: e.target.value, latitude: null, longitude: null });
                      }}
                      placeholder="Escribí tu dirección y seleccioná una opción..."
                      required
                    />
                    {/* Suggestions */}
                    {status === "OK" && data.length > 0 && (
                      <ul className="absolute left-0 right-0 bg-white border rounded mt-1 z-50 max-h-56 overflow-auto">
                        {data.map(({ place_id, description }) => (
                          <li
                            key={place_id}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleSelectAddress(description)}
                          >
                            {description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* helper text showing if lat/lng captured */}
                  {formData.latitude && formData.longitude ? (
                    <div className="text-sm text-muted-foreground mt-2">Ubicación seleccionada: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-2">Seleccioná la dirección correcta desde las sugerencias para fijar la ubicación exacta.</div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="388-123-4567" />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input id="whatsapp" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="388-123-4567" required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contacto@complejo.com" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Servicios, Canchas y resto igual que antes (omitido por brevedad en este bloque) */}
            {/* Copiá aquí el resto de los cards y el código que ya tenías (amenities, canchas, etc.) */}
            {/* ... */}

            <div className="flex justify-center">
              <Button type="submit" size="lg" disabled={loading || courts.length === 0} className="px-8">
                {loading ? "Registrando..." : "Registrar Complejo"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RegisterComplex;
