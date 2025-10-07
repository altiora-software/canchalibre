import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import MapSection from "@/components/MapSection";
import SportComplexCard from "@/components/SportComplexCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  TrendingUp, 
  Users, 
  Star,
  ArrowRight,
  Search,
  Loader2
} from "lucide-react";
import { useComplexes, SportComplexData } from "@/hooks/useComplexes";
import heroImage from "@/assets/hero-sports-complex.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  
  const { complexes, loading, error } = useComplexes();

  console.log('complexes', complexes)
  // Filter complexes based on selected sport and search term
  const filteredComplexes = useMemo(() => {
    let filtered = complexes;
    
    // Filter by sport
    if (selectedSport !== "todos") {
      filtered = filtered.filter(complex => 
        complex.courts?.some(court => 
          court.sport.toLowerCase().includes(selectedSport.toLowerCase())
        )
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(complex =>
        complex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complex.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complex.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complex.courts?.some(court => 
          court.sport.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return filtered;
  }, [complexes, selectedSport, searchTerm]);

  const handleComplexDetails = (complex: SportComplexData) => {
    navigate(`/complex/${complex.id}`);
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
  };

  // Statistics
  const stats = {
    totalComplexes: complexes.length,
    openNow: complexes.filter(c => c.is_active).length,
    averageRating: "4.5", // Placeholder until we add ratings
    totalSports: [...new Set(complexes.flatMap(c => c.courts?.map(court => court.sport) || []))].length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando canchas...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Cancha Libre - Encuentra las Mejores Canchas Deportivas en San Salvador de Jujuy</title>
        <meta name="description" content="Descubre y reserva canchas deportivas en San Salvador de Jujuy. Fútbol, básquet, tenis, vóley, handball, padle y skateparks. Encuentra horarios, precios y contacta por WhatsApp." />
        <meta name="keywords" content="canchas deportivas Jujuy, fútbol 5 San Salvador, básquet Jujuy, tenis Jujuy, reservar cancha deportiva, complejos deportivos Argentina" />
        <link rel="canonical" href="https://canchasjujuy.com" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Cancha Libre - Las Mejores Canchas Deportivas" />
        <meta property="og:description" content="Encuentra y reserva canchas deportivas en San Salvador de Jujuy. Más de 50 complejos disponibles." />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="website" />
        
        {/* Local Business Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Cancha Libre",
            "description": "Plataforma para encontrar y reservar canchas deportivas en San Salvador de Jujuy",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "San Salvador de Jujuy",
              "addressRegion": "Jujuy",
              "addressCountry": "AR"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": -24.1858,
              "longitude": -65.3004
            },
            "url": "https://canchasjujuy.com",
            "telephone": "+54-388-XXX-XXXX",
            "openingHours": "Mo-Su 00:00-23:59",
            "priceRange": "$$$"
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <Header
          selectedSport={selectedSport}
          onSportChange={setSelectedSport}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <main>
          {/* Hero Section */}
          <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={heroImage}
                alt="Complejo deportivo moderno en San Salvador de Jujuy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-hero"></div>
            </div>

            {/* Hero Content */}
            <div className="relative z-10 container mx-auto px-4 text-center text-white">
              <div className="max-w-4xl mx-auto space-y-6">
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  San Salvador de Jujuy
                </Badge>
                
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  Encuentra las Mejores
                  <span className="block bg-gradient-to-r from-white to-primary-glow bg-clip-text text-transparent">
                    Canchas Deportivas
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
                  Descubre, compara y reserva canchas de fútbol, básquet, tenis y más en un solo lugar
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                  <Button 
                    size="lg" 
                    className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all text-lg px-8 py-6"
                    onClick={() => {
                      document.getElementById('complexes-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Explorar Canchas
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white/30 text-primary hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-6"
                    onClick={() => {
                      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Agregar Mi Complejo
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-2xl mx-auto">
                  {[
                    { icon: "🏟️", label: "Complejos", value: stats.totalComplexes },
                    { icon: "🟢", label: "Abiertos", value: stats.openNow },
                    { icon: "⭐", label: "Rating Prom.", value: stats.averageRating },
                    { icon: "🏆", label: "Deportes", value: stats.totalSports }
                  ].map((stat, index) => (
                    <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-sm text-white/70">{stat.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Map Section */}
          <section id="map-section" className="py-8 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Explora el Mapa Interactivo
                </h2>
                <p className="text-lg text-muted-foreground">
                  Encuentra canchas cerca de tu ubicación
                </p>
              </div>
              
              <MapSection 
                selectedSport={selectedSport}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </section>

          {/* Complexes Grid */}
          <section id="complexes-section" className="py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    {selectedSport === "todos" ? "Todos los Complejos" : `Canchas de ${selectedSport}`}
                  </h2>
                  <p className="text-muted-foreground">
                    {filteredComplexes.length} {filteredComplexes.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                  </p>
                </div>

                {filteredComplexes.length > 6 && (
                  <Button variant="outline" className="hidden md:flex">
                    Ver Todos
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>

              {filteredComplexes.length === 0 ? (
                <Card className="p-12 text-center bg-muted/30">
                  <div className="space-y-4">
                    <div className="text-6xl">🏟️</div>
                    <h3 className="text-xl font-semibold">No se encontraron resultados</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Intenta cambiar los filtros o el término de búsqueda para encontrar más opciones
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedSport("todos");
                        setSearchTerm("");
                      }}
                    >
                      Limpiar Filtros
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredComplexes.slice(0, 6).map((complex) => (
                    <SportComplexCard
                      key={complex.id}
                      complex={complex}
                      onViewDetails={handleComplexDetails}
                    />
                  ))}
                </div>
              )}

              {/* Load More Button for Mobile */}
              {filteredComplexes.length > 6 && (
                <div className="text-center mt-8 md:hidden">
                  <Button variant="outline" size="lg">
                    Ver Más Canchas
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Contact Section for Complex Owners */}
          <section id="contact-section" className="py-12 bg-gradient-to-b from-secondary/10 to-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                    ¿Tienes un Complejo Deportivo?
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Únete a la red de complejos deportivos más grande de Jujuy y aumenta la visibilidad de tu negocio
                  </p>
                </div>

                <Card className="p-8 shadow-card-custom border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        {
                          icon: "📱",
                          title: "Gestión Digital",
                          description: "Panel completo para gestionar reservas y horarios"
                        },
                        {
                          icon: "💰",
                          title: "Más Ingresos",
                          description: "Aumenta la ocupación de tus canchas hasta 40%"
                        },
                        {
                          icon: "📊",
                          title: "Analíticas",
                          description: "Reportes detallados de tu negocio y tendencias"
                        }
                      ].map((benefit, index) => (
                        <div key={index} className="text-center space-y-3">
                          <div className="text-4xl">{benefit.icon}</div>
                          <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                          <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 pt-4">
                      <h3 className="text-xl font-semibold text-foreground">
                        ¡Contáctanos para agregar tu complejo!
                      </h3>
                      <p className="text-muted-foreground">
                        Nos pondremos en contacto contigo para configurar tu cuenta y agregar tu complejo a la plataforma
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                        <Button 
                          size="lg" 
                          className="bg-gradient-sport hover:shadow-sport transition-all text-lg px-8 py-6"
                          onClick={() => window.open('https://wa.me/5493884123456?text=Hola! Tengo un complejo deportivo y me interesa unirme a Cancha Libre', '_blank')}
                        >
                          📱 WhatsApp: +54 388 412-3456
                        </Button>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="text-lg px-8 py-6"
                          onClick={() => window.location.href = 'mailto:canchalibrejujuy@gmail.com?subject=Quiero agregar mi complejo'}
                        >
                          ✉️ canchalibrejujuy@gmail.com
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-12 bg-gradient-to-b from-muted/30 to-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  ¿Por qué elegir Cancha Libre?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  La forma más fácil de encontrar y reservar canchas deportivas en San Salvador de Jujuy
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    icon: <Search className="w-8 h-8 text-primary" />,
                    title: "Búsqueda Inteligente",
                    description: "Encuentra la cancha perfecta por ubicación, deporte y horario disponible"
                  },
                  {
                    icon: <MapPin className="w-8 h-8 text-secondary" />,
                    title: "Mapa Interactivo",
                    description: "Ve todas las opciones en un mapa y elige la más conveniente para ti"
                  },
                  {
                    icon: <Users className="w-8 h-8 text-primary" />,
                    title: "Contacto Directo",
                    description: "Contacta directamente por WhatsApp con los dueños de cada complejo"
                  }
                ].map((feature, index) => (
                  <Card key={index} className="p-6 text-center hover:shadow-card-hover transition-all border-0 shadow-card-custom">
                    <CardContent className="p-0 space-y-4">
                      <div className="flex justify-center">{feature.icon}</div>
                      <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-foreground text-white py-8">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-sport rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CL</span>
              </div>
              <span className="text-xl font-bold">Cancha Libre</span>
            </div>
            <p className="text-white/70 mb-4">
              La plataforma líder para encontrar canchas deportivas en San Salvador de Jujuy
            </p>
            <div className="flex justify-center space-x-6 text-sm text-white/60">
              <span>© 2024 Cancha Libre</span>
              <span>•</span>
              <span>Términos</span>
              <span>•</span>
              <span>Privacidad</span>
              <span>•</span>
              <span>Contacto</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;