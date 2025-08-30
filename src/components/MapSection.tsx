import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Search,
  Maximize2,
  Minimize2,
  ExternalLink
} from "lucide-react";
import { useComplexes } from "@/hooks/useComplexes";

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sport: string;
  rating: number;
  isOpen: boolean;
  address: string;
  whatsapp: string;
}

interface MapSectionProps {
  selectedSport: string;
  onLocationSelect: (location: MapLocation) => void;
}

const MapSection = ({ selectedSport, onLocationSelect }: MapSectionProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [mapView, setMapView] = useState<'roadmap' | 'satellite'>('roadmap');
  const { complexes } = useComplexes();

  // Convert complexes to map locations
  const mapLocations: MapLocation[] = complexes
    .filter(complex => complex.latitude && complex.longitude)
    .map(complex => ({
      id: complex.id,
      name: complex.name,
      lat: complex.latitude!,
      lng: complex.longitude!,
      sport: complex.courts?.[0]?.sport || 'fútbol',
      rating: 4.5, // Placeholder
      isOpen: complex.is_active,
      address: complex.address,
      whatsapp: complex.whatsapp
    }));

  const filteredLocations = selectedSport === 'todos' 
    ? mapLocations 
    : mapLocations.filter(location => 
        location.sport.toLowerCase() === selectedSport.toLowerCase() ||
        complexes.find(c => c.id === location.id)?.courts?.some(court => 
          court.sport.toLowerCase() === selectedSport.toLowerCase()
        )
      );

  const getSportIcon = (sport: string) => {
    const icons: { [key: string]: string } = {
      'fútbol': '⚽',
      'básquet': '🏀',
      'tenis': '🎾',
      'vóley': '🏐',
      'handball': '🤾',
      'skate': '🛹',
    };
    return icons[sport] || '🏆';
  };

  const handleLocationClick = (location: MapLocation) => {
    setSelectedLocation(location);
    onLocationSelect(location);
  };

  const handleWhatsAppContact = (location: MapLocation) => {
    const message = `Hola! Me interesa información sobre ${location.name} en ${location.address}`;
    const whatsappUrl = `https://wa.me/${location.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openInGoogleMaps = () => {
    const center = filteredLocations.length > 0 
      ? `${filteredLocations[0].lat},${filteredLocations[0].lng}`
      : '-24.1858,-65.3004';
    
    let markersQuery = '';
    if (filteredLocations.length > 0) {
      markersQuery = filteredLocations
        .map(loc => `${loc.lat},${loc.lng}`)
        .join('|');
    }
    
    const url = `https://www.google.com/maps/search/?api=1&query=canchas+deportivas+san+salvador+jujuy&center=${center}&zoom=13`;
    window.open(url, '_blank');
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[400px] lg:h-[500px]'} transition-all duration-300`}>
      {/* Google Maps Iframe */}
      <div className="relative w-full h-full rounded-lg overflow-hidden border border-border shadow-card-custom">
        <iframe
          src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d57906.84750924748!2d-65.33049999999999!3d-24.1858!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x941b0e0e4c5b9b6b%3A0x8e8b8f1b1b1b1b1b!2sSan%20Salvador%20de%20Jujuy%2C%20Jujuy!5e${mapView === 'satellite' ? '1' : '0'}!3m2!1ses!2sar!4v1640995200000!5m2!1ses!2sar`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Mapa de canchas deportivas en San Salvador de Jujuy"
        />
        
        {/* Custom Markers Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {filteredLocations.map((location, index) => (
            <div
              key={location.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{
                left: `${45 + index * 5}%`,
                top: `${45 + index * 3}%`,
              }}
            >
              <div 
                className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-all border-2 border-white group"
                onClick={() => handleLocationClick(location)}
              >
                <span className="text-sm">{getSportIcon(location.sport)}</span>
                
                {/* Tooltip */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                  <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {location.name}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Location Details Card */}
        {selectedLocation && (
          <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-72">
            <Card className="shadow-lg border-0 shadow-card-hover">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-lg">{selectedLocation.name}</h4>
                    <Badge variant={selectedLocation.isOpen ? "default" : "secondary"}>
                      {selectedLocation.isOpen ? "Abierto" : "Cerrado"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm">
                      ⭐ {selectedLocation.rating} • {getSportIcon(selectedLocation.sport)} {selectedLocation.sport}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleWhatsAppContact(selectedLocation)}
                      className="flex-1"
                    >
                      <span className="mr-2">📱</span>
                      WhatsApp
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedLocation(null)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
            onClick={() => setMapView(mapView === 'roadmap' ? 'satellite' : 'roadmap')}
          >
            <Layers className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
            onClick={openInGoogleMaps}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* Legend */}
        {!selectedLocation && (
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-border max-w-xs z-10">
            <h4 className="text-sm font-medium mb-2">Leyenda</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🏆</span>
                </div>
                <span>Abierto</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-muted-foreground text-xs">🏆</span>
                </div>
                <span>Cerrado</span>
              </div>
            </div>
          </div>
        )}

        {/* Location Counter */}
        <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground rounded-lg px-3 py-2 shadow-sm z-10">
          <span className="text-sm font-medium">
            {filteredLocations.length} ubicaciones
          </span>
        </div>
      </div>

      {/* Fullscreen Overlay Controls */}
      {isFullscreen && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            onClick={() => setIsFullscreen(false)}
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Salir de pantalla completa
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapSection;