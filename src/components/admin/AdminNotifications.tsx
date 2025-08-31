import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Send, Bell, Users, Building2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  type: 'trial_ending' | 'subscription_expired' | 'approval_approved' | 'approval_rejected' | 'custom';
}

interface SportComplex {
  id: string;
  name: string;
  owner_id: string;
  payment_status: string;
  subscription_expires_at: string | null;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

const AdminNotifications = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [targetAudience, setTargetAudience] = useState<'all' | 'trial' | 'expired' | 'active'>('all');
  const [loading, setLoading] = useState(false);
  const [complexes, setComplexes] = useState<SportComplex[]>([]);
  const [sentNotifications, setSentNotifications] = useState<number>(0);
  const { toast } = useToast();

  const templates: NotificationTemplate[] = [
    {
      id: 'trial_ending',
      name: 'Fin de período de prueba',
      subject: '⏰ Tu período de prueba está por finalizar',
      message: `Hola {owner_name},

Tu período de prueba de 15 días para {complex_name} está por finalizar el {expiry_date}.

Para continuar disfrutando de todos los beneficios de nuestra plataforma, te invitamos a activar tu suscripción.

¡No pierdas la oportunidad de seguir gestionando tu complejo deportivo de manera eficiente!

Saludos,
Equipo Cancha Libre`,
      type: 'trial_ending'
    },
    {
      id: 'subscription_expired',
      name: 'Suscripción vencida',
      subject: '🚨 Tu suscripción ha vencido',
      message: `Hola {owner_name},

Tu suscripción para {complex_name} ha vencido el {expiry_date}.

Para reactivar tu complejo y seguir recibiendo reservas, es necesario que renueves tu suscripción.

Contacta con nosotros para resolver esta situación cuanto antes.

Saludos,
Equipo Cancha Libre`,
      type: 'subscription_expired'
    },
    {
      id: 'approval_approved',
      name: 'Complejo aprobado',
      subject: '🎉 ¡Tu complejo ha sido aprobado!',
      message: `¡Felicitaciones {owner_name}!

Tu complejo {complex_name} ha sido aprobado y ya está disponible en nuestra plataforma.

Ahora tienes 15 días de prueba gratuita para que puedas probar todas las funcionalidades.

¡Bienvenido a Cancha Libre!

Saludos,
Equipo Cancha Libre`,
      type: 'approval_approved'
    },
    {
      id: 'approval_rejected',
      name: 'Complejo rechazado',
      subject: '❌ Necesitamos revisar tu complejo',
      message: `Hola {owner_name},

Hemos revisado tu complejo {complex_name} y necesitamos que realices algunas correcciones antes de poder aprobarlo.

Motivo: {rejection_reason}

Por favor, realiza las correcciones necesarias y vuelve a enviar tu solicitud.

Saludos,
Equipo Cancha Libre`,
      type: 'approval_rejected'
    }
  ];

  useEffect(() => {
    fetchComplexes();
  }, []);

  const fetchComplexes = async () => {
    try {
      const { data, error } = await supabase
        .from('sport_complexes')
        .select(`
          *,
          profiles:owner_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplexes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los complejos: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getFilteredComplexes = () => {
    const now = new Date();

    switch (targetAudience) {
      case 'trial':
        return complexes.filter(c => 
          c.payment_status === 'trial' && 
          c.subscription_expires_at && 
          new Date(c.subscription_expires_at) > now
        );
      case 'expired':
        return complexes.filter(c => 
          c.subscription_expires_at && 
          new Date(c.subscription_expires_at) <= now
        );
      case 'active':
        return complexes.filter(c => 
          c.payment_status === 'active' && 
          c.subscription_expires_at && 
          new Date(c.subscription_expires_at) > now
        );
      default:
        return complexes;
    }
  };

  const replaceVariables = (template: string, complex: SportComplex) => {
    return template
      .replace(/{owner_name}/g, complex.profiles?.full_name || 'Propietario')
      .replace(/{complex_name}/g, complex.name)
      .replace(/{expiry_date}/g, complex.subscription_expires_at 
        ? new Date(complex.subscription_expires_at).toLocaleDateString('es-AR')
        : 'No definida'
      );
  };

  const sendNotifications = async () => {
    setLoading(true);
    setSentNotifications(0);

    try {
      const targetComplexes = getFilteredComplexes();
      const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

      if (!selectedTemplateData && !customMessage) {
        throw new Error("Debes seleccionar una plantilla o escribir un mensaje personalizado");
      }

      let sent = 0;
      
      for (const complex of targetComplexes) {
        if (!complex.profiles?.email) continue;

        const subject = selectedTemplateData 
          ? replaceVariables(selectedTemplateData.subject, complex)
          : customSubject;
          
        const message = selectedTemplateData 
          ? replaceVariables(selectedTemplateData.message, complex)
          : customMessage;

        // Here you would integrate with your email service (SendGrid, etc.)
        // For now, we'll simulate the notification
        console.log(`Sending notification to ${complex.profiles.email}:`, {
          subject,
          message,
          complex: complex.name
        });

        sent++;
        setSentNotifications(sent);
        
        // Add a small delay to simulate real email sending
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: "¡Notificaciones enviadas!",
        description: `Se enviaron ${sent} notificaciones exitosamente.`,
      });

      // Clear form
      setSelectedTemplate("");
      setCustomMessage("");
      setCustomSubject("");
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al enviar notificaciones: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredComplexes = getFilteredComplexes();
  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      {/* Audience Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Público Objetivo</span>
          </CardTitle>
          <CardDescription>
            Selecciona a quién quieres enviar las notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                targetAudience === 'all' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setTargetAudience('all')}
            >
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-5 h-5" />
                <Badge variant="secondary">
                  {complexes.length}
                </Badge>
              </div>
              <h4 className="font-medium">Todos los Complejos</h4>
              <p className="text-sm text-muted-foreground">Enviar a todos los propietarios</p>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                targetAudience === 'trial' ? 'border-blue-500 bg-blue-50/50' : 'hover:bg-muted/50'
              }`}
              onClick={() => setTargetAudience('trial')}
            >
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <Badge variant="secondary">
                  {complexes.filter(c => 
                    c.payment_status === 'trial' && 
                    c.subscription_expires_at && 
                    new Date(c.subscription_expires_at) > new Date()
                  ).length}
                </Badge>
              </div>
              <h4 className="font-medium">Período de Prueba</h4>
              <p className="text-sm text-muted-foreground">Complejos en prueba activa</p>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                targetAudience === 'expired' ? 'border-red-500 bg-red-50/50' : 'hover:bg-muted/50'
              }`}
              onClick={() => setTargetAudience('expired')}
            >
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <Badge variant="destructive">
                  {complexes.filter(c => 
                    c.subscription_expires_at && 
                    new Date(c.subscription_expires_at) <= new Date()
                  ).length}
                </Badge>
              </div>
              <h4 className="font-medium">Suscripciones Vencidas</h4>
              <p className="text-sm text-muted-foreground">Necesitan renovación</p>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                targetAudience === 'active' ? 'border-green-500 bg-green-50/50' : 'hover:bg-muted/50'
              }`}
              onClick={() => setTargetAudience('active')}
            >
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <Badge variant="default">
                  {complexes.filter(c => 
                    c.payment_status === 'active' && 
                    c.subscription_expires_at && 
                    new Date(c.subscription_expires_at) > new Date()
                  ).length}
                </Badge>
              </div>
              <h4 className="font-medium">Suscripciones Activas</h4>
              <p className="text-sm text-muted-foreground">Complejos con pago activo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Composition */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Plantillas de Notificación</span>
            </CardTitle>
            <CardDescription>
              Usa plantillas predefinidas o crea un mensaje personalizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Seleccionar Plantilla</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige una plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateData && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Vista Previa</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Asunto:</strong> {selectedTemplateData.subject}</p>
                  <div className="max-h-32 overflow-y-auto">
                    <p><strong>Mensaje:</strong></p>
                    <pre className="whitespace-pre-wrap text-xs">
                      {selectedTemplateData.message}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Message */}
        <Card>
          <CardHeader>
            <CardTitle>Mensaje Personalizado</CardTitle>
            <CardDescription>
              Envía un mensaje personalizado (opcional si usas plantilla)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customSubject">Asunto Personalizado</Label>
              <Input
                id="customSubject"
                placeholder="Asunto del mensaje..."
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                disabled={!!selectedTemplate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customMessage">Mensaje Personalizado</Label>
              <Textarea
                id="customMessage"
                placeholder="Escribe tu mensaje personalizado aquí..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={8}
                disabled={!!selectedTemplate}
              />
            </div>
            <div className="p-3 bg-blue-50/50 rounded-lg">
              <p className="text-xs text-blue-600">
                💡 Variables disponibles: {"{owner_name}"}, {"{complex_name}"}, {"{expiry_date}"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Enviar Notificaciones</span>
            </div>
            {loading && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Enviando... ({sentNotifications} enviadas)</span>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Se enviarán {filteredComplexes.length} notificaciones al público seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Destinatarios: {filteredComplexes.length} complejos
              </p>
              <p className="text-xs text-muted-foreground">
                Solo se enviarán a complejos con email registrado
              </p>
            </div>
            <Button 
              onClick={sendNotifications}
              disabled={loading || (!selectedTemplate && !customMessage) || filteredComplexes.length === 0}
              className="flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? "Enviando..." : "Enviar Notificaciones"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotifications;