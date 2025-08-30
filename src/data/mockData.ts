export interface SportComplexData {
  id: string;
  name: string;
  description: string;
  address: string;
  neighborhood: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  sports: string[];
  hours: {
    open: string;
    close: string;
  };
  phone: string;
  whatsapp: string;
  priceRange: string;
  features: string[];
  isOpen: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const mockSportComplexes: SportComplexData[] = [];

export const neighborhoods = [
  "Todos los barrios",
  "Centro", 
  "Alto Comedero", 
  "Los Perales", 
  "Cuyaya", 
  "Palpalá",
  "Villa Jardin",
  "Barrio Norte"
];

export const sportTypes = [
  { id: "todos", name: "Todos", icon: "🏆" },
  { id: "futbol", name: "Fútbol", icon: "⚽" },
  { id: "basquet", name: "Básquet", icon: "🏀" },
  { id: "tenis", name: "Tenis", icon: "🎾" },
  { id: "voley", name: "Vóley", icon: "🏐" },
  { id: "handball", name: "Handball", icon: "🤾" },
  { id: "skate", name: "Skate", icon: "🛹" },
  { id: "padel", name: "Pádel", icon: "🏓" },
];