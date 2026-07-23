import { FormEvent, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, MapPin, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type ApplicationForm = {
  contactName: string; contactEmail: string; contactPhone: string; relationship: string; preferredContact: string;
  complexName: string; address: string; neighborhood: string; city: string; province: string; publicPhone: string;
  sports: string[]; courtCount: string; operationType: string; openingTime: string; closingTime: string;
  verificationStatus: string; representationConfirmed: boolean; privacyConsent: boolean;
};

const sportOptions = ["Fútbol", "Básquet", "Pádel", "Tenis", "Vóley", "Hockey", "Otro"];
const initialForm: ApplicationForm = {
  contactName: "", contactEmail: "", contactPhone: "", relationship: "", preferredContact: "whatsapp",
  complexName: "", address: "", neighborhood: "", city: "San Salvador de Jujuy", province: "Jujuy", publicPhone: "",
  sports: [], courtCount: "", operationType: "", openingTime: "", closingTime: "", verificationStatus: "",
  representationConfirmed: false, privacyConsent: false,
};

const stepNames = ["Tus datos", "El complejo", "Verificación"];

const OwnerApplication = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(form.contactName.trim() && form.contactEmail.trim() && form.contactPhone.trim() && form.relationship);
    if (step === 1) return Boolean(form.complexName.trim() && form.address.trim() && form.neighborhood.trim() && form.city.trim() && form.province.trim() && form.publicPhone.trim() && form.sports.length && form.courtCount && form.operationType && form.openingTime && form.closingTime);
    return Boolean(form.verificationStatus && form.representationConfirmed && form.privacyConsent);
  }, [form, step]);

  const toggleSport = (sport: string) => update("sports", form.sports.includes(sport) ? form.sports.filter((item) => item !== sport) : [...form.sports, sport]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canContinue) return;
    setSubmitting(true); setError(null);
    const regularHours = Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => [day, { closed: false, open: form.openingTime, close: form.closingTime }]));
    const payload = {
      website: "",
      contact: { name: form.contactName.trim(), email: form.contactEmail.trim().toLowerCase(), phone: form.contactPhone.trim(), role: form.relationship, preferredContact: form.preferredContact },
      complex: { name: form.complexName.trim(), address: form.address.trim(), neighborhood: form.neighborhood.trim(), city: form.city.trim(), province: form.province.trim(), publicPhone: form.publicPhone.trim(), sports: form.sports, courtCount: Number(form.courtCount), operationType: form.operationType, openingHours: regularHours },
      verification: { status: form.verificationStatus, authorizedRepresentative: form.representationConfirmed, consent: form.privacyConsent },
    };
    const { error: submitError } = await supabase.functions.invoke("submit-owner-application", { body: payload });
    if (submitError) { setError("No pudimos enviar tu solicitud. Revisá los datos e intentá nuevamente."); setSubmitting(false); return; }
    setSubmitted(true); setSubmitting(false);
  };

  if (submitted) return (
    <main className="min-h-screen bg-muted/30 p-4"><Helmet><title>Solicitud enviada | Cancha Libre</title></Helmet><div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center"><Card className="w-full text-center shadow-lg"><CardContent className="space-y-5 p-8"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-8 w-8" /></div><h1 className="text-3xl font-bold">Solicitud recibida</h1><p className="text-muted-foreground">Vamos a verificar los datos de <strong className="text-foreground">{form.complexName}</strong>. Si la aprobamos, te enviaremos una invitación a <strong className="text-foreground">{form.contactEmail}</strong>.</p><Alert><AlertDescription>Hasta que Cancha Libre apruebe la cuenta y el complejo, no habrá publicación en el catálogo, mapa ni reservas.</AlertDescription></Alert><Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button></CardContent></Card></div></main>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-background to-background p-4 dark:from-emerald-950/20">
      <Helmet><title>Publicá tu complejo | Cancha Libre</title><meta name="description" content="Solicitud para publicar un complejo deportivo en Cancha Libre." /></Helmet>
      <div className="mx-auto max-w-3xl py-8 sm:py-12">
        <div className="mb-8 text-center"><div className="mb-4 flex items-center justify-center gap-2 text-primary"><Building2 className="h-6 w-6" /><span className="font-bold">Cancha Libre</span></div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Solicitud de publicación</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Sumá tu complejo a Cancha Libre</h1><p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Revisamos cada solicitud antes de habilitar una cuenta. La aprobación de tu cuenta y la publicación del complejo son instancias separadas.</p></div>
        <Card className="shadow-xl"><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>{stepNames[step]}</CardTitle><CardDescription> Paso {step + 1} de {stepNames.length}</CardDescription></div><div className="flex gap-1" aria-label={`Paso ${step + 1} de ${stepNames.length}`}>{stepNames.map((name, index) => <span key={name} className={`h-2 w-9 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div></div></CardHeader>
          <CardContent><form onSubmit={submit} className="space-y-6">
            {step === 0 && <section className="space-y-5"><p className="text-sm text-muted-foreground">Usaremos estos datos sólo para verificar la solicitud y enviarte la invitación si queda aprobada.</p><div className="grid gap-5 sm:grid-cols-2"><Field label="Nombre y apellido" required><Input value={form.contactName} onChange={(event) => update("contactName", event.target.value)} autoComplete="name" /></Field><Field label="Email que usás habitualmente" required><Input type="email" value={form.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} autoComplete="email" /></Field><Field label="Teléfono / WhatsApp" required><Input type="tel" value={form.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} autoComplete="tel" /></Field><Field label="Relación con el complejo" required><Select value={form.relationship} onValueChange={(value) => update("relationship", value)}><SelectTrigger><SelectValue placeholder="Seleccioná una opción" /></SelectTrigger><SelectContent><SelectItem value="owner">Propietario/a</SelectItem><SelectItem value="authorized_administrator">Administrador/a autorizado/a</SelectItem><SelectItem value="company_representative">Representante de la empresa</SelectItem></SelectContent></Select></Field></div><Field label="Preferís que te contactemos por"><Select value={form.preferredContact} onValueChange={(value) => update("preferredContact", value)}><SelectTrigger className="sm:max-w-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="phone">Llamada telefónica</SelectItem></SelectContent></Select></Field></section>}
            {step === 1 && <section className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><Field label="Nombre comercial" required><Input value={form.complexName} onChange={(event) => update("complexName", event.target.value)} /></Field><Field label="Teléfono público del complejo" required><Input type="tel" value={form.publicPhone} onChange={(event) => update("publicPhone", event.target.value)} /></Field><Field label="Dirección" required className="sm:col-span-2"><Input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Calle y altura" /></Field><Field label="Barrio" required><Input value={form.neighborhood} onChange={(event) => update("neighborhood", event.target.value)} /></Field><Field label="Ciudad" required><Input value={form.city} onChange={(event) => update("city", event.target.value)} /></Field><Field label="Provincia" required><Input value={form.province} onChange={(event) => update("province", event.target.value)} /></Field><Field label="Tipo de operación" required><Select value={form.operationType} onValueChange={(value) => update("operationType", value)}><SelectTrigger><SelectValue placeholder="Seleccioná una opción" /></SelectTrigger><SelectContent><SelectItem value="court_rental">Alquiler de canchas</SelectItem><SelectItem value="club">Club</SelectItem><SelectItem value="sports_school">Escuela deportiva</SelectItem><SelectItem value="sports_center">Polideportivo</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent></Select></Field><Field label="Cantidad estimada de canchas" required><Select value={form.courtCount} onValueChange={(value) => update("courtCount", value)}><SelectTrigger><SelectValue placeholder="Seleccioná" /></SelectTrigger><SelectContent>{[1,2,3,4,5,6,7,8,9,10].map((amount) => <SelectItem key={amount} value={String(amount)}>{amount}{amount === 10 ? "+" : ""}</SelectItem>)}</SelectContent></Select></Field><Field label="Horario de apertura" required><Input type="time" value={form.openingTime} onChange={(event) => update("openingTime", event.target.value)} /></Field><Field label="Horario de cierre" required><Input type="time" value={form.closingTime} onChange={(event) => update("closingTime", event.target.value)} /></Field></div><p className="text-xs text-muted-foreground">Este horario habitual se registrará para todos los días; antes de publicar podrás detallar días cerrados y horarios específicos.</p><fieldset><legend className="mb-3 text-sm font-medium text-foreground">Deportes que ofrece <span className="text-destructive">*</span></legend><div className="flex flex-wrap gap-2">{sportOptions.map((sport) => <Button key={sport} type="button" variant={form.sports.includes(sport) ? "default" : "outline"} size="sm" aria-pressed={form.sports.includes(sport)} onClick={() => toggleSport(sport)}>{sport}</Button>)}</div></fieldset></section>}
            {step === 2 && <section className="space-y-5"><div className="rounded-xl border border-primary/15 bg-primary/5 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h2 className="font-semibold">Cancha Libre valida antes de habilitar</h2><p className="mt-1 text-sm text-muted-foreground">Validaremos el contacto y la información comercial. Si aprobamos a la persona responsable, enviaremos una invitación. Luego, el complejo quedará en borrador hasta una revisión final de publicación.</p></div></div></div><Field label="Estado actual de la habilitación comercial" required><Select value={form.verificationStatus} onValueChange={(value) => update("verificationStatus", value)}><SelectTrigger><SelectValue placeholder="Seleccioná una opción" /></SelectTrigger><SelectContent><SelectItem value="licensed">Cuenta con habilitación</SelectItem><SelectItem value="in_process">Está en trámite</SelectItem><SelectItem value="not_available">Aún no cuenta con habilitación</SelectItem></SelectContent></Select></Field><Consent checked={form.representationConfirmed} onCheckedChange={(checked) => update("representationConfirmed", checked)} label="Confirmo que estoy autorizado/a para representar este complejo." /><Consent checked={form.privacyConsent} onCheckedChange={(checked) => update("privacyConsent", checked)} label="Acepto que Cancha Libre use estos datos para revisar mi solicitud y contactarme. No se publicarán hasta que Cancha Libre apruebe el complejo." /></section>}
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="flex items-center justify-between border-t pt-5"><Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)} disabled={step === 0 || submitting}><ChevronLeft className="mr-1 h-4 w-4" /> Atrás</Button>{step < stepNames.length - 1 ? <Button type="button" onClick={() => canContinue && setStep((current) => current + 1)} disabled={!canContinue}><span>Siguiente</span><ChevronRight className="ml-1 h-4 w-4" /></Button> : <Button type="submit" disabled={!canContinue || submitting}>{submitting ? "Enviando…" : "Enviar solicitud"}<ClipboardCheck className="ml-2 h-4 w-4" /></Button>}</div>
          </form></CardContent></Card>
        <p className="mt-5 text-center text-sm text-muted-foreground">¿Ya recibiste una invitación? <Link to="/owners/auth" className="font-medium text-primary underline-offset-4 hover:underline">Ingresar al portal</Link></p>
      </div>
    </main>
  );
};

const Field = ({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) => <div className={`space-y-2 ${className ?? ""}`}><Label>{label}{required && <span className="text-destructive"> *</span>}</Label>{children}</div>;
const Consent = ({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (value: boolean) => void; label: string }) => <div className="flex items-start gap-3 rounded-lg border p-4"><Checkbox id={label} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} /><Label htmlFor={label} className="cursor-pointer text-sm font-normal leading-5">{label}</Label></div>;

export default OwnerApplication;
