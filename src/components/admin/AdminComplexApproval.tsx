import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Eye, Building2, MapPin, Phone, Mail, Globe, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SportComplex {
  id: string;
  name: string;
  address: string;
  neighborhood?: string;
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
  description?: string;
  photos?: string[];
  amenities?: string[];
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  payment_status?: string;
  subscription_expires_at?: string;
  owner_id: string;
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  sport_courts?: Array<{
    id: string;
    name: string;
    sport: string;
    hourly_price?: number;
  }>;
}

const AdminComplexApproval = () => {
  const [complexes, setComplexes] = useState<SportComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  
  useEffect(() => {
    fetchComplexes();
  }, []);

  const fetchComplexes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
      .from('sport_complexes')
      .select(`*, profiles:owner_id ( full_name, email, phone ), sport_courts ( id, name, sport, hourly_price )`)
      .order('created_at', { ascending: false });

      if (error) throw error;
      setComplexes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los complejos: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveComplex = async (complexId: string) => {
    try {
      setProcessingId(complexId);
      const { error } = await (supabase.rpc as any)('approve_complex', {
        p_complex_id: complexId,
        p_trial_days: 15,
      });
      if (error) throw error;
  
      toast({ title: "Complejo Aprobado", description: "15 días de prueba activados." });
      fetchComplexes();
    } catch (e:any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };
  
  const rejectComplex = async (complexId: string) => {
    try {
      setProcessingId(complexId);
      const { error } = await (supabase.rpc as any)('reject_complex', {
        p_complex_id: complexId,
        p_reason: rejectionReason || null,
      });
      if (error) throw error;
  
      toast({ title: "Complejo Rechazado", description: "Se registró el motivo." , variant:"destructive"});
      setRejectionReason("");
      fetchComplexes();
    } catch (e:any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };
  

  const getStatusBadge = (complex: SportComplex) => {
    if (!complex.is_approved) {
      return <Badge variant="destructive">Pendiente</Badge>;
    }
    if (complex.payment_status === 'trial') {
      return <Badge variant="secondary">Período de Prueba</Badge>;
    }
    if (complex.payment_status === 'active') {
      return <Badge variant="default">Activo</Badge>;
    }
    if (complex.payment_status === 'expired') {
      return <Badge variant="outline">Expirado</Badge>;
    }
    return <Badge variant="secondary">Desconocido</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const ComplexCard = ({ complex }: { complex: SportComplex }) => (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>{complex.name}</span>
            </CardTitle>
            <CardDescription className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>{complex.address}</span>
              {complex.neighborhood && <span>- {complex.neighborhood}</span>}
            </CardDescription>
          </div>
          {getStatusBadge(complex)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Owner Information */}
        <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
          <Avatar>
            <AvatarFallback>
              {complex.profiles?.full_name?.[0] || complex.profiles?.email?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{complex.profiles?.full_name || 'Sin nombre'}</p>
            <p className="text-sm text-muted-foreground">{complex.profiles?.email}</p>
            {complex.profiles?.phone && (
              <p className="text-xs text-muted-foreground">{complex.profiles.phone}</p>
            )}
          </div>
        </div>

        {/* Complex Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            {complex.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{complex.phone}</span>
              </div>
            )}
            {complex.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{complex.email}</span>
              </div>
            )}
            {complex.website && (
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{complex.website}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Registrado: {formatDate(complex.created_at)}</span>
            </div>
            {complex.subscription_expires_at && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Expira: {formatDate(complex.subscription_expires_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Courts Summary */}
        {complex.sport_courts && complex.sport_courts.length > 0 && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="font-medium mb-2">Canchas ({complex.sport_courts.length})</p>
            <div className="flex flex-wrap gap-2">
              {complex.sport_courts.map((court) => (
                <Badge key={court.id} variant="outline" className="text-xs">
                  {court.name} - {court.sport}
                  {court.hourly_price && ` ($${court.hourly_price}/h)`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {complex.description && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="font-medium mb-1">Descripción</p>
            <p className="text-sm text-muted-foreground">{complex.description}</p>
          </div>
        )}

        {/* Amenities */}
        {complex.amenities && complex.amenities.length > 0 && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="font-medium mb-2">Comodidades</p>
            <div className="flex flex-wrap gap-1">
              {complex.amenities.map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!complex.is_approved && (
          <div className="flex space-x-2 pt-4 border-t">
            <Button
              onClick={() => approveComplex(complex.id)}
              disabled={processingId === complex.id}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Aprobar (15 días gratis)
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={processingId === complex.id}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rechazar Complejo</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que quieres rechazar "{complex.name}"? Esta acción se puede revertir más tarde.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo del rechazo (opcional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explica el motivo del rechazo para notificar al propietario..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => rejectComplex(complex.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Rechazar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const pendingComplexes = complexes.filter(c => !c.is_approved);
  const approvedComplexes = complexes.filter(c => c.is_approved);

  return (
    <Tabs defaultValue="pending" className="space-y-6">
      <TabsList>
        <TabsTrigger value="pending" className="relative">
          Pendientes
          {pendingComplexes.length > 0 && (
            <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 text-xs">
              {pendingComplexes.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="approved">
          Aprobados ({approvedComplexes.length})
        </TabsTrigger>
        <TabsTrigger value="all">
          Todos ({complexes.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4">
        {pendingComplexes.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Check className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-medium">¡Todo al día!</h3>
                <p className="text-muted-foreground">No hay complejos pendientes de aprobación.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          pendingComplexes.map((complex) => (
            <ComplexCard key={complex.id} complex={complex} />
          ))
        )}
      </TabsContent>

      <TabsContent value="approved" className="space-y-4">
        {approvedComplexes.map((complex) => (
          <ComplexCard key={complex.id} complex={complex} />
        ))}
      </TabsContent>

      <TabsContent value="all" className="space-y-4">
        {complexes.map((complex) => (
          <ComplexCard key={complex.id} complex={complex} />
        ))}
      </TabsContent>
    </Tabs>
  );
};

export default AdminComplexApproval;