import { BellOff, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The product does not yet have an audited delivery contract for broadcast
 * messages. Keep this surface explicit instead of simulating email sends in
 * the browser or logging owner contact data.
 */
export default function AdminNotifications() {
  return <Card className="border-dashed">
    <CardHeader><CardTitle className="flex items-center gap-2"><BellOff className="h-5 w-5" />Comunicaciones no disponibles</CardTitle><CardDescription>Esta sección queda preparada para el centro de comunicaciones, pero no envía mensajes desde el navegador.</CardDescription></CardHeader>
    <CardContent className="space-y-3 text-sm text-muted-foreground"><p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Antes de habilitar envíos se necesita un contrato server-side autenticado, auditoría de destinatarios, límites de frecuencia y registro de entrega.</p><p>Mientras tanto, las aprobaciones y rechazos siguen siendo la fuente operativa de cada revisión.</p></CardContent>
  </Card>;
}
