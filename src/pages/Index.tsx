import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import { 
  ArrowRight,
  Loader2,
  MapPin,
  Search,
  Users
} from "lucide-react";
import { useComplexes, SportComplexData } from "@/hooks/useComplexes";
import heroImage from "@/assets/hero-sports-complex.jpg";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SportComplexCard from "@/components/SportComplexCard";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";

const Index = () => {
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const { isOwner } = useProfile()
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (isOwner) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [isOwner, navigate]);
  // 1) pasar un valor "seguro" al hook para evitar acceder a user.id cuando user === null
  //    (useComplexes debe manejar un id vacío o undefined; si no, adaptar useComplexes)
  const userIdSafe = user?.id ?? ""; // o undefined si el hook lo soporta
  const { complexes, loading } = useComplexes(user?.id ?? undefined, false);

  console.log("user", user);
  console.log("complexes", complexes);
  console.log("loading", loading);

  // 3) si no hay user aún, podés mostrar un loader compacto (opcional)
  //    Esto evita que la UI que asume datos del usuario intente renderizar antes de tiempo.
  if (!user && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando usuario y canchas...</span>
        </div>
      </div>
    );
  }

// Filter complexes based on selected sport and search term (robust)



  const handleComplexDetails = (complex: SportComplexData) => {
    navigate(`/complex/${complex.id}`);
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
  };

  // Statistics (usar valores por defecto)
  const stats = {
    totalComplexes: complexes.length,
    openNow: complexes.filter(c => c.is_active).length,
    averageRating: "4.5",
    totalSports: [...new Set(complexes.flatMap(c => c.courts?.map(court => court?.sport) || []))].length
  };

  const sports = [
    { id: "todos", name: "Todos", icon: "🏆" },
    { id: "futbol", name: "Fútbol", icon: "⚽" },
    { id: "basquet", name: "Básquet", icon: "🏀" },
    { id: "tenis", name: "Tenis", icon: "🎾" },
    { id: "voley", name: "Vóley", icon: "🏐" },
    { id: "handball", name: "Handball", icon: "🤾" },
    { id: "skate", name: "Skate", icon: "🛹" },
    { id: "padle", name: "Padle", icon: "🎾" },
  ];

  // Filtro común, sin useMemo
let filteredComplexes: SportComplexData[] = [];

try {
  const list = Array.isArray(complexes) ? complexes : [];

  const sportFilter = (selectedSport ?? "todos").toString().toLowerCase();
  const term = (searchTerm ?? "").toString().trim().toLowerCase();

  if (sportFilter === "todos" && term === "") {
    filteredComplexes = list;
  } else {
    filteredComplexes = list.filter((complex) => {
      const name = (complex?.name ?? "").toString().toLowerCase();
      const neighborhood = (complex?.neighborhood ?? "").toString().toLowerCase();
      const address = (complex?.address ?? "").toString().toLowerCase();
      const courts = Array.isArray(complex?.courts) ? complex.courts : [];

      // 1️⃣ Filtro por deporte
      if (sportFilter !== "todos") {
        const hasSport = courts.some((court) => {
          try {
            return (court?.sport ?? "")
              .toString()
              .toLowerCase()
              .includes(sportFilter);
          } catch {
            return false;
          }
        });

        if (!hasSport) return false;
      }

      // 2️⃣ Filtro por término de búsqueda
      if (term) {
        const matchesText =
          name.includes(term) ||
          neighborhood.includes(term) ||
          address.includes(term) ||
          courts.some((court) =>
            (court?.sport ?? "").toString().toLowerCase().includes(term)
          );

        if (!matchesText) return false;
      }

      return true;
    });
  }
} catch (e) {
  console.error("Error en filtro de complejos:", e);
  filteredComplexes = Array.isArray(complexes) ? complexes : [];
}


  if (loading && complexes.length === 0) {
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
        <meta name="description" content="Descubre y reserva canchas deportivas..." />
        <meta property="og:image" content={heroImage} />
      </Helmet>

      <div className="min-h-screen bg-background">
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
          <div className="w-full border-t border-border/50 py-4 flex justify-center">
            <div
              className="
                flex flex-wrap justify-center gap-3
                px-3 sm:px-6 md:px-8
                lg:flex-nowrap lg:justify-center lg:overflow-visible
                max-w-6xl w-full
              "
            >
              {sports.map((sport) => (
                <Badge
                  key={sport.id}
                  variant={selectedSport === sport.id ? "default" : "outline"}
                  className={`
                    cursor-pointer select-none
                    text-xs sm:text-sm lg:text-sm
                    px-2 py-1.5 sm:px-3 sm:py-2 lg:px-3 lg:py-2
                    transition-all duration-150 rounded-lg
                    hover:scale-105 active:scale-95
                    whitespace-nowrap
                    flex-initial
                    ${selectedSport === sport.id
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "hover:border-primary hover:text-primary"}
                  `}
                  onClick={() => setSelectedSport(sport.id)}
                >
                  <span className="mr-2 text-sm sm:text-base lg:text-base">{sport.icon}</span>
                  {sport.name}
                </Badge>
              ))}
            </div>
          </div>


          {/* Map Section */}
          {/* <section id="map-section" className="py-8 bg-muted/30">
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
          </section> */}

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

        {/* — Footer— */}
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
