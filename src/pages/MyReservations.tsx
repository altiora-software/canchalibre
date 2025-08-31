import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Phone, CreditCard, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useReservations, ReservationData } from "@/hooks/useReservations";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const MyReservations = () => {
  const { user } = useAuth();
  const { reservations, loading, error, refetch } = useReservations();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'paid':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'paid':
        return 'Pagada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'mercado_pago':
        return 'Mercado Pago';
      case 'transfer':
        return 'Transferencia';
      case 'cash':
        return 'Efectivo';
      default:
        return method;
    }
  };

  const handleWhatsAppContact = (reservation: any) => {
    const message = `Hola! Consulto por mi reserva del ${format(new Date(reservation.reservation_date), 'dd/MM/yyyy', { locale: es })} de ${reservation.start_time} a ${reservation.end_time} en ${reservation.sport_complexes?.name}`;
    const phone = reservation.sport_complexes?.whatsapp || reservation.sport_complexes?.phone;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/54${cleanPhone}?text=${encodeURIComponent(message)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mis Reservas - Cancha Libre</title>
        <meta name="description" content="Gestiona todas tus reservas de canchas deportivas en San Salvador de Jujuy" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Mis Reservas</h1>
              <p className="text-muted-foreground">
                Gestiona todas tus reservas de canchas deportivas
              </p>
            </div>

            {error && (
              <Card className="mb-6 border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <p className="text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {reservations.length === 0 ? (
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes reservas</h3>
                  <p className="text-muted-foreground mb-4">
                    Explora nuestros complejos deportivos y haz tu primera reserva
                  </p>
                  <Button onClick={() => navigate("/")} className="bg-gradient-sport">
                    Explorar Canchas
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {reservations.map((reservation: any, index) => (
                  <Card key={reservation.id} className="shadow-card-custom hover:shadow-card-hover transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl text-foreground">
                            {reservation.sport_complexes?.name}
                          </CardTitle>
                          <p className="text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {reservation.sport_complexes?.address}
                          </p>
                        </div>
                        <Badge className={getStatusColor(reservation.payment_status)}>
                          {getStatusText(reservation.payment_status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-foreground">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {format(new Date(reservation.reservation_date), 'EEEE, dd MMMM yyyy', { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <Clock className="w-4 h-4 text-primary" />
                            <span>{reservation.start_time} - {reservation.end_time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <span className="w-4 h-4 text-center text-primary">🏟️</span>
                            <span>{reservation.sport_courts?.name} ({reservation.sport_courts?.sport})</span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-foreground">
                            <CreditCard className="w-4 h-4 text-primary" />
                            <span>Total: ${reservation.total_price}</span>
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <span className="w-4 h-4 text-center text-primary">💳</span>
                            <span>{getPaymentMethodText(reservation.payment_method)}</span>
                          </div>
                          {reservation.deposit_amount > 0 && (
                            <div className="flex items-center gap-2 text-foreground">
                              <span className="w-4 h-4 text-center text-primary">💰</span>
                              <span>
                                Seña: ${reservation.deposit_amount} 
                                {reservation.deposit_paid ? ' (Pagada)' : ' (Pendiente)'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {reservation.notes && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Notas:</strong> {reservation.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWhatsAppContact(reservation)}
                          className="flex items-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Contactar por WhatsApp
                        </Button>
                        
                        {reservation.sport_complexes?.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${reservation.sport_complexes.phone}`)}
                            className="flex items-center gap-2"
                          >
                            <Phone className="w-4 h-4" />
                            Llamar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MyReservations;