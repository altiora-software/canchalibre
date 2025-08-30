import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Clock, 
  Star, 
  Phone, 
  MessageCircle, 
  ExternalLink,
  Heart,
  Share2,
  Calendar
} from "lucide-react";
import { SportComplexData } from "@/hooks/useComplexes";

interface SportComplexCardProps {
  complex: SportComplexData;
  onViewDetails: (complex: SportComplexData) => void;
}

const SportComplexCard = ({ complex, onViewDetails }: SportComplexCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Transform data to match expected format
  const imageUrl = complex.photos?.[0] || "/placeholder.svg";
  const isOpen = complex.is_active;
  const sports = complex.courts?.map(court => court.sport) || [];
  const uniqueSports = [...new Set(sports)];
  const rating = 4.5; // Placeholder until we add ratings
  const reviewCount = 12; // Placeholder
  const priceRange = complex.courts?.length > 0 ? `$${complex.courts[0].hourly_price || 2000}/h` : "$2000/h";
  const description = complex.address;

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Hola! Me interesa reservar una cancha en ${complex.name}. ¿Podrían darme más información?`
    );
    const whatsappNumber = complex.whatsapp?.replace(/[^\d]/g, '') || complex.phone?.replace(/[^\d]/g, '');
    if (whatsappNumber) {
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: complex.name,
        text: `¡Mira este complejo deportivo en Jujuy! ${complex.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Card className="group overflow-hidden bg-white hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border-0 shadow-card-custom">
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={complex.name}
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-sport rounded-lg"></div>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top Actions */}
        <div className="absolute top-3 right-3 flex space-x-2">
          <Button
            size="sm"
            variant="ghost"
            className="bg-white/90 hover:bg-white text-foreground w-8 h-8 p-0 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="bg-white/90 hover:bg-white text-foreground w-8 h-8 p-0 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <Badge 
            variant={isOpen ? "default" : "secondary"}
            className={`${
              isOpen 
                ? "bg-green-500 text-white" 
                : "bg-red-500 text-white"
            } shadow-sm`}
          >
            {isOpen ? "Abierto" : "Cerrado"}
          </Badge>
        </div>

        {/* Price Range */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="outline" className="bg-white/90 text-foreground backdrop-blur-sm border-white/50">
            {priceRange}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              {complex.name}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="w-3 h-3 mr-1" />
              {complex.neighborhood}
            </div>
          </div>
          
          {/* Rating */}
          <div className="flex items-center space-x-1 ml-3">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">{rating}</span>
            <span className="text-xs text-muted-foreground">({reviewCount})</span>
          </div>
        </div>

        {/* Sports */}
        <div className="flex flex-wrap gap-1 mt-3">
          {uniqueSports.slice(0, 3).map((sport) => (
            <Badge key={sport} variant="outline" className="text-xs bg-accent/50 border-accent-foreground/20">
              {sport}
            </Badge>
          ))}
          {uniqueSports.length > 3 && (
            <Badge variant="outline" className="text-xs bg-muted">
              +{uniqueSports.length - 3} más
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>

        {/* Info Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-muted-foreground">
            <Clock className="w-4 h-4 mr-1" />
            Consultar horarios
          </div>
          <div className="flex items-center text-muted-foreground">
            <Calendar className="w-4 h-4 mr-1" />
            Reservar
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={() => onViewDetails(complex)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver Detalles
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handleWhatsAppContact();
            }}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SportComplexCard;