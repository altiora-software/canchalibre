import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Clock, 
  Plus, 
  Trash2,
  Upload,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

type SportType = "futbol" | "basquet" | "tenis" | "voley" | "handball" | "skate";

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
  });
  
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

  const addCourt = () => {
    if (!currentCourt.name || !currentCourt.sport) {
      toast({
        title: "Error",
        description: "Completa todos los campos de la cancha",
        variant: "destructive",
      });
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

  const removeCourt = (index: number) => {
    setCourts(courts.filter((_, i) => i !== index));
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, amenities: [...formData.amenities, amenity] });
    } else {
      setFormData({
        ...formData,
        amenities: formData.amenities.filter(a => a !== amenity)
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOwner) return;

    if (courts.length === 0) {
      toast({
        title: "Error",
        description: "Agrega al menos una cancha",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get or create user profile
      let { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // If profile doesn't exist, create it
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

      // Create complex
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
        })
        .select()
        .single();

      if (complexError) throw complexError;

      // Create courts
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

      const { error: courtsError } = await supabase
        .from('sport_courts')
        .insert(courtsData);

      if (courtsError) throw courtsError;

      toast({
        title: "¡Complejo registrado!",
        description: "Tu complejo está en revisión. Te contactaremos por WhatsApp para activarlo.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || profileLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!isOwner) {
    navigate('/');
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Registrar Complejo - Cancha Libre</title>
        <meta name="description" content="Registra tu complejo deportivo en Cancha Libre y aumenta la visibilidad de tus canchas." />
      </Helmet>

      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Registra tu Complejo Deportivo
            </h1>
            <p className="text-xl text-muted-foreground">
              Únete a la plataforma líder en Jujuy y aumenta la visibilidad de tus canchas
            </p>
          </div>

          <Alert className="mb-8 border-primary/20 bg-primary/5">
            <CheckCircle className="w-4 h-4 text-primary" />
            <AlertDescription className="text-foreground">
              <strong>Proceso de registro:</strong> Una vez completado el formulario, 
              nuestro equipo revisará tu complejo y te contactaremos por WhatsApp 
              para finalizar el proceso de pago y activación.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información del Complejo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Información del Complejo
                </CardTitle>
                <CardDescription>
                  Datos principales de tu complejo deportivo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre del Complejo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Complejo Deportivo San Martín"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Barrio</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="Ej: Alto Comedero"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ej: Av. Senador Pérez 1234"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe tu complejo deportivo, servicios destacados, etc."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="388-123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="388-123-4567"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contacto@complejo.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Servicios y Comodidades */}
            <Card>
              <CardHeader>
                <CardTitle>Servicios y Comodidades</CardTitle>
                <CardDescription>
                  Selecciona los servicios que ofrece tu complejo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {amenitiesOptions.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onCheckedChange={(checked) => 
                          handleAmenityChange(amenity, checked as boolean)
                        }
                      />
                      <Label htmlFor={amenity} className="text-sm">
                        {amenity}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Canchas */}
            <Card>
              <CardHeader>
                <CardTitle>Canchas</CardTitle>
                <CardDescription>
                  Agrega todas las canchas de tu complejo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Formulario para agregar cancha */}
                <div className="p-4 border border-dashed border-muted-foreground/30 rounded-lg space-y-4">
                  <h4 className="font-medium">Agregar Nueva Cancha</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="court-name">Nombre de la Cancha</Label>
                      <Input
                        id="court-name"
                        value={currentCourt.name}
                        onChange={(e) => setCurrentCourt({ ...currentCourt, name: e.target.value })}
                        placeholder="Ej: Cancha 1, Cancha Principal"
                      />
                    </div>
                    <div>
                      <Label htmlFor="court-sport">Deporte</Label>
                      <Select
                        value={currentCourt.sport}
                        onValueChange={(value) => setCurrentCourt({ ...currentCourt, sport: value as SportType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar deporte" />
                        </SelectTrigger>
                        <SelectContent>
                          {sports.map((sport) => (
                            <SelectItem key={sport.value} value={sport.value}>
                              {sport.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="players-capacity">Cantidad de Jugadores</Label>
                      <Select
                        value={currentCourt.playersCapacity.toString()}
                        onValueChange={(value) => setCurrentCourt({ ...currentCourt, playersCapacity: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 jugadores</SelectItem>
                          <SelectItem value="6">6 jugadores</SelectItem>
                          <SelectItem value="7">7 jugadores</SelectItem>
                          <SelectItem value="8">8 jugadores</SelectItem>
                          <SelectItem value="11">11 jugadores</SelectItem>
                          <SelectItem value="10">10 jugadores (básquet)</SelectItem>
                          <SelectItem value="12">12 jugadores (vóley)</SelectItem>
                          <SelectItem value="14">14 jugadores (handball)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="surface-type">Tipo de Superficie</Label>
                      <Input
                        id="surface-type"
                        value={currentCourt.surfaceType}
                        onChange={(e) => setCurrentCourt({ ...currentCourt, surfaceType: e.target.value })}
                        placeholder="Ej: Césped sintético, Cemento"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly-price">Precio por Hora ($)</Label>
                      <Input
                        id="hourly-price"
                        type="number"
                        value={currentCourt.hourlyPrice}
                        onChange={(e) => setCurrentCourt({ ...currentCourt, hourlyPrice: parseFloat(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-lighting"
                        checked={currentCourt.hasLighting}
                        onCheckedChange={(checked) => 
                          setCurrentCourt({ ...currentCourt, hasLighting: checked as boolean })
                        }
                      />
                      <Label htmlFor="has-lighting">Iluminación</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-roof"
                        checked={currentCourt.hasRoof}
                        onCheckedChange={(checked) => 
                          setCurrentCourt({ ...currentCourt, hasRoof: checked as boolean })
                        }
                      />
                      <Label htmlFor="has-roof">Techada</Label>
                    </div>
                  </div>

                  <Button type="button" onClick={addCourt} className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Cancha
                  </Button>
                </div>

                {/* Lista de canchas agregadas */}
                {courts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Canchas Agregadas ({courts.length})</h4>
                    {courts.map((court, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <h5 className="font-medium">{court.name}</h5>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="secondary">
                              {sports.find(s => s.value === court.sport)?.label}
                            </Badge>
                            <Badge variant="outline">
                              {court.playersCapacity} jugadores
                            </Badge>
                            {court.hasLighting && <Badge variant="outline">Iluminación</Badge>}
                            {court.hasRoof && <Badge variant="outline">Techada</Badge>}
                            {court.hourlyPrice > 0 && (
                              <Badge variant="outline">${court.hourlyPrice}/hora</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCourt(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botón de envío */}
            <div className="flex justify-center">
              <Button 
                type="submit" 
                size="lg" 
                disabled={loading || courts.length === 0}
                className="px-8"
              >
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