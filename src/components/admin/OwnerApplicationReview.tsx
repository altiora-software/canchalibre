import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardList, Loader2, Mail, MapPin, MessageSquareMore, Phone, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ApplicationStatus = "submitted" | "under_review" | "changes_requested" | "approved" | "invited" | "activated" | "rejected";
type OwnerApplication = {
  id: string; status: ApplicationStatus; created_at: string; applicant_full_name: string; applicant_email: string; applicant_phone: string;
  relationship_to_complex: string; preferred_contact: string; complex_name: string; address: string; neighborhood: string; city: string; province: string;
  complex_phone: string; sports: string[]; court_count: number; operation_type: string; opening_hours: Record<string, unknown>; applicant_message?: string | null;
};

const statusLabels: Record<ApplicationStatus, string> = { submitted: "Pendiente", under_review: "En revisión", changes_requested: "Correcciones solicitadas", approved: "Aprobada", invited: "Invitada", activated: "Activada", rejected: "Rechazada" };
const statusVariant: Record<ApplicationStatus, "default" | "secondary" | "destructive" | "outline"> = { submitted: "secondary", under_review: "outline", changes_requested: "outline", approved: "default", invited: "secondary", activated: "default", rejected: "destructive" };

const OwnerApplicationReview = () => {
  const [applications, setApplications] = useState<OwnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const loadApplications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)("owner_applications")
      .select("id, status, created_at, applicant_full_name, applicant_email, applicant_phone, relationship_to_complex, preferred_contact, complex_name, address, neighborhood, city, province, complex_phone, sports, court_count, operation_type, opening_hours, applicant_message")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "No se pudieron cargar las solicitudes", description: "Verificá los permisos administrativos e intentá nuevamente.", variant: "destructive" });
    else setApplications((data ?? []) as OwnerApplication[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void loadApplications(); }, [loadApplications]);

  const review = async (application: OwnerApplication, action: "approved" | "changes_requested" | "rejected" | "under_review") => {
    const ownerNote = notes[application.id]?.trim() ?? "";
    if ((action === "changes_requested" || action === "rejected") && !ownerNote) {
      toast({ title: "Agregá un mensaje", description: "La persona solicitante necesita una explicación para poder actuar.", variant: "destructive" });
      return;
    }
    setProcessing(application.id);
    const { error } = action === "approved"
      ? await supabase.functions.invoke("invite-approved-owner", { body: { applicationId: application.id } })
      : action === "changes_requested"
        ? await (supabase.rpc as any)("request_owner_application_changes", { p_application_id: application.id, p_message: ownerNote })
        : action === "rejected"
          ? await (supabase.rpc as any)("reject_owner_application", { p_application_id: application.id, p_reason: ownerNote })
          : await (supabase.rpc as any)("review_owner_application", { p_application_id: application.id, p_internal_notes: ownerNote || null });
    if (error) toast({ title: "No se pudo registrar la decisión", description: error.message, variant: "destructive" });
    else {
      toast({ title: action === "approved" ? "Solicitud aprobada e invitada" : action === "rejected" ? "Solicitud rechazada" : action === "under_review" ? "Solicitud tomada para revisión" : "Correcciones solicitadas", description: action === "approved" ? "La cuenta se habilita solamente cuando la persona complete el flujo seguro de invitación." : "La decisión quedó registrada." });
      await loadApplications();
    }
    setProcessing(null);
  };

  const renderApplications = (items: OwnerApplication[]) => items.length ? items.map((application) => <ApplicationCard key={application.id} application={application} note={notes[application.id] ?? ""} onNote={(value) => setNotes((current) => ({ ...current, [application.id]: value }))} onReview={review} processing={processing === application.id} />) : <Card><CardContent className="py-10 text-center"><ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-medium">No hay solicitudes en esta bandeja.</p></CardContent></Card>;
  const pending = applications.filter((item) => item.status === "submitted" || item.status === "under_review" || item.status === "changes_requested");

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return <Tabs defaultValue="pending" className="space-y-5"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="pending">Pendientes ({pending.length})</TabsTrigger><TabsTrigger value="approved">Aprobadas</TabsTrigger><TabsTrigger value="rejected">Rechazadas</TabsTrigger></TabsList><TabsContent value="pending" className="space-y-4">{renderApplications(pending)}</TabsContent><TabsContent value="approved" className="space-y-4">{renderApplications(applications.filter((item) => item.status === "approved"))}</TabsContent><TabsContent value="rejected" className="space-y-4">{renderApplications(applications.filter((item) => item.status === "rejected"))}</TabsContent></Tabs>;
};

const ApplicationCard = ({ application, note, onNote, onReview, processing }: { application: OwnerApplication; note: string; onNote: (value: string) => void; onReview: (application: OwnerApplication, action: "approved" | "changes_requested" | "rejected" | "under_review") => void; processing: boolean }) => (
  <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{application.complex_name}</CardTitle><CardDescription>Recibida {new Date(application.created_at).toLocaleDateString("es-AR")}</CardDescription></div><Badge variant={statusVariant[application.status]}>{statusLabels[application.status]}</Badge></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 text-sm md:grid-cols-2"><section className="space-y-2 rounded-lg bg-muted/40 p-4"><p className="font-semibold">Responsable</p><p className="flex gap-2"><span>{application.applicant_full_name}</span><span className="text-muted-foreground">· {application.relationship_to_complex}</span></p><p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" />{application.applicant_email}</p><p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" />{application.applicant_phone} · {application.preferred_contact}</p></section><section className="space-y-2 rounded-lg bg-muted/40 p-4"><p className="font-semibold">Complejo</p><p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{application.address}, {application.neighborhood}, {application.city}, {application.province}</p><p className="text-muted-foreground">{application.court_count} cancha(s) · {application.operation_type}</p></section></div><div><p className="mb-2 text-sm font-medium">Deportes</p><div className="flex flex-wrap gap-2">{application.sports.map((sport) => <Badge key={sport} variant="secondary">{sport}</Badge>)}</div></div>{application.applicant_message && <Alert><AlertDescription>{application.applicant_message}</AlertDescription></Alert>}{application.status !== "approved" && application.status !== "rejected" && <div className="space-y-3 border-t pt-5"><Label htmlFor={`review-${application.id}`}>Mensaje para la persona solicitante <span className="text-muted-foreground">(obligatorio al pedir correcciones o rechazar)</span></Label><Textarea id={`review-${application.id}`} value={note} onChange={(event) => onNote(event.target.value)} placeholder="Indicá qué verificaste o qué información debe corregir." /><div className="flex flex-wrap gap-2">{application.status !== "under_review" && <Button disabled={processing} variant="outline" onClick={() => onReview(application, "under_review")}><ClipboardList className="mr-2 h-4 w-4" />Tomar revisión</Button>}<Button disabled={processing} onClick={() => onReview(application, "approved")}><Check className="mr-2 h-4 w-4" />Aprobar e invitar</Button><Button disabled={processing} variant="outline" onClick={() => onReview(application, "changes_requested")}><MessageSquareMore className="mr-2 h-4 w-4" />Pedir correcciones</Button><Button disabled={processing} variant="destructive" onClick={() => onReview(application, "rejected")}><X className="mr-2 h-4 w-4" />Rechazar</Button></div><p className="text-xs text-muted-foreground">Aprobar a la persona envía una invitación validada por servidor. El complejo seguirá sin publicar hasta su revisión final.</p></div>}</CardContent></Card>
);

export default OwnerApplicationReview;
