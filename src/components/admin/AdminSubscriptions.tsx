import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, CreditCard, AlertTriangle, CheckCircle, Building2, User, Mail, Phone, Globe, MapPin } from "lucide-react";
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
  owner_id: string;
  payment_status: string;
  subscription_expires_at: string | null;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
}

const AdminSubscriptions = () => {
  const [complexes, setComplexes] = useState<SportComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [extensionDays, setExtensionDays] = useState<string>("30");
  const { toast } = useToast();

  useEffect(() => {
    fetchComplexes();
  }, []);

  const fetchComplexes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sport_complexes')
        .select(`
          *,
          profiles:owner_id (
            full_name,
            email,
            phone,
            role
          )
        `)
        .eq('is_approved', true)
        .order('subscription_expires_at', { ascending: true });

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

  const updateSubscriptionStatus = async (complexId: string, newStatus: string, daysToAdd?: number) => {
    try {
      setProcessingId(complexId);
      
      let updates: any = {
        payment_status: newStatus,
      };

      if (daysToAdd) {
        const currentExpiry = complexes.find(c => c.id === complexId)?.subscription_expires_at;
        const baseDate = currentExpiry && new Date(currentExpiry) > new Date() 
          ? new Date(currentExpiry)
          : new Date();
        
        const newExpiryDate = new Date(baseDate);
        newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);
        updates.subscription_expires_at = newExpiryDate.toISOString();
      }

      const { error } = await supabase
        .from('sport_complexes')
        .update(updates)
        .eq('id', complexId);

      if (error) throw error;

      toast({
        title: "Suscripción actualizada",
        description: "El estado de la suscripción ha sido actualizado correctamente.",
      });

      fetchComplexes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la suscripción: " + error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const activateSubscription = (complexId: string) => {
    const days = parseInt(extensionDays);
    if (days > 0) {
      updateSubscriptionStatus(complexId, 'active', days);
    }
  };

  const suspendSubscription = (complexId: string) => {
    updateSubscriptionStatus(complexId, 'suspended');
  };

  const getStatusBadge = (complex: SportComplex) => {
    const now = new Date();
    const expiryDate = complex.subscription_expires_at ? new Date(complex.subscription_expires_at) : null;
    const isExpired = expiryDate && expiryDate <= now;

    if (complex.payment_status === 'suspended') {
      return <Badge variant="destructive">Suspendida</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    if (complex.payment_status === 'trial') {
      return <Badge variant="secondary">Período de Prueba</Badge>;
    }
    if (complex.payment_status === 'active') {
      return <Badge variant="default">Activa</Badge>;
    }
    return <Badge variant="outline">Pendiente</Badge>;
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const ComplexSubscriptionCard = ({ complex }: { complex: SportComplex }) => {
    const daysUntilExpiry = getDaysUntilExpiry(complex.subscription_expires_at);
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

    return (
      <Card className={`w-full ${isExpired ? 'border-red-200 bg-red-50/30' : isExpiringSoon ? 'border-yellow-200 bg-yellow-50/30' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>{complex.name}</span>
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{complex.address}</span>
                {complex.neighborhood && <span>- {complex.neighborhood}</span>}
              </div>
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
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span>{complex.profiles?.email}</span>
              </div>
              {complex.profiles?.phone && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{complex.profiles.phone}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs mt-1">
                {complex.profiles?.role || 'owner'}
              </Badge>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Fecha de registro</p>
                  <p className="text-xs text-muted-foreground">{formatDate(complex.created_at)}</p>
                </div>
              </div>
              
              {complex.subscription_expires_at && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {isExpired ? 'Venció el' : 'Vence el'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(complex.subscription_expires_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Estado de pago</p>
                  <p className="text-xs text-muted-foreground capitalize">{complex.payment_status}</p>
                </div>
              </div>

              {daysUntilExpiry !== null && (
                <div className="flex items-center space-x-2">
                  {isExpired ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : isExpiringSoon ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {isExpired ? 'Vencida hace' : 'Días restantes'}
                    </p>
                    <p className={`text-xs ${isExpired || isExpiringSoon ? 'text-red-600' : 'text-green-600'}`}>
                      {Math.abs(daysUntilExpiry)} días
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          {(complex.phone || complex.email || complex.website) && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="font-medium mb-2 text-sm">Información de contacto del complejo</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {complex.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3 h-3" />
                    <span>{complex.phone}</span>
                  </div>
                )}
                {complex.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3 h-3" />
                    <span>{complex.email}</span>
                  </div>
                )}
                {complex.website && (
                  <div className="flex items-center space-x-2 col-span-2">
                    <Globe className="w-3 h-3" />
                    <span className="truncate">{complex.website}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {(isExpired || isExpiringSoon || complex.payment_status === 'trial') && (
              <div className="flex items-center space-x-2 flex-1">
                <Select value={extensionDays} onValueChange={setExtensionDays}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => activateSubscription(complex.id)}
                  disabled={processingId === complex.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activar
                </Button>
              </div>
            )}

            {complex.payment_status === 'active' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={processingId === complex.id}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Suspender
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspender Suscripción</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Estás seguro de que quieres suspender la suscripción de "{complex.name}"? 
                      El complejo dejará de estar visible para los usuarios.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => suspendSubscription(complex.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Suspender
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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

  // Filter complexes by status
  const activeComplexes = complexes.filter(c => {
    const now = new Date();
    const expiryDate = c.subscription_expires_at ? new Date(c.subscription_expires_at) : null;
    return c.payment_status === 'active' && expiryDate && expiryDate > now;
  });

  const trialComplexes = complexes.filter(c => {
    const now = new Date();
    const expiryDate = c.subscription_expires_at ? new Date(c.subscription_expires_at) : null;
    return c.payment_status === 'trial' && expiryDate && expiryDate > now;
  });

  const expiredComplexes = complexes.filter(c => {
    const now = new Date();
    const expiryDate = c.subscription_expires_at ? new Date(c.subscription_expires_at) : null;
    return (expiryDate && expiryDate <= now) || c.payment_status === 'suspended';
  });

  const expiringSoonComplexes = complexes.filter(c => {
    const daysUntilExpiry = getDaysUntilExpiry(c.subscription_expires_at);
    return daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Suscripciones Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{activeComplexes.length}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Períodos de Prueba
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{trialComplexes.length}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Por Vencer (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{expiringSoonComplexes.length}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Vencidas/Suspendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{expiredComplexes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Management */}
      <div className="space-y-6">
        {/* Expired/Suspended - High Priority */}
        {expiredComplexes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Requieren Atención Inmediata ({expiredComplexes.length})
            </h3>
            <div className="space-y-4">
              {expiredComplexes.map((complex) => (
                <ComplexSubscriptionCard key={complex.id} complex={complex} />
              ))}
            </div>
          </div>
        )}

        {/* Expiring Soon - Medium Priority */}
        {expiringSoonComplexes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Vencen Pronto - 7 días o menos ({expiringSoonComplexes.length})
            </h3>
            <div className="space-y-4">
              {expiringSoonComplexes.map((complex) => (
                <ComplexSubscriptionCard key={complex.id} complex={complex} />
              ))}
            </div>
          </div>
        )}

        {/* Trial Subscriptions */}
        {trialComplexes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Períodos de Prueba Activos ({trialComplexes.length})
            </h3>
            <div className="space-y-4">
              {trialComplexes.map((complex) => (
                <ComplexSubscriptionCard key={complex.id} complex={complex} />
              ))}
            </div>
          </div>
        )}

        {/* Active Subscriptions */}
        {activeComplexes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Suscripciones Activas ({activeComplexes.length})
            </h3>
            <div className="space-y-4">
              {activeComplexes.map((complex) => (
                <ComplexSubscriptionCard key={complex.id} complex={complex} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No data state */}
      {complexes.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium">No hay complejos registrados</h3>
              <p className="text-muted-foreground">Los complejos aprobados aparecerán aquí.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSubscriptions;