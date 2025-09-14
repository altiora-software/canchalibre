import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
// Corregido el import para que coincida el casing con el nombre real del archivo
import { useProfileStore } from "@/store/ProfileStore";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import { Camera, Save, User, Phone, MapPin, Mail } from "lucide-react";

const sportsList = ["fútbol", "tenis", "básquet", "vóley", "pádel", "handball"];

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { getMyProfile, updateMyProfile, uploadAvatar } = useUserProfile();

  const draft = useProfileStore((s) => s.draft);
  const setDraft = useProfileStore((s) => s.setDraft);
  const patchDraft = useProfileStore((s) => s.patchDraft);
  const resetDraft = useProfileStore((s) => s.resetDraft);
  const loading = useProfileStore((s) => s.loading);
  const setLoading = useProfileStore((s) => s.setLoading);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const load = async () => {
      setLoading(true);
      const p = await getMyProfile();
      if (p) {
        setDraft({
          full_name: p.full_name ?? "",
          phone: p.phone ?? "",
          whatsapp: p.whatsapp ?? "",
          avatar_url: p.avatar_url ?? null,
          city: p.city ?? "",
          fav_sports: p.fav_sports ?? [],
          notify_email: p.notify_email ?? true,
          notify_whatsapp: p.notify_whatsapp ?? true,
        });
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSelectSport = (s: string) => {
    const list = new Set(draft.fav_sports || []);
    list.has(s) ? list.delete(s) : list.add(s);
    patchDraft({ fav_sports: Array.from(list) });
  };

  const onAvatarPick = async (file?: File | null) => {
    if (!file) return;
    try {
      setSaving(true);
      const url = await uploadAvatar(file);
      patchDraft({ avatar_url: url });
      toast({ title: "Avatar actualizado" });
    } catch (e: any) {
      toast({ title: "Error subiendo avatar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    try {
      setSaving(true);
      await updateMyProfile({
        full_name: draft.full_name ?? "",
        phone: (draft.phone || "").replace(/\D/g, ""),
        whatsapp: (draft.whatsapp || "").replace(/\D/g, ""),
        avatar_url: draft.avatar_url ?? null,
        city: draft.city ?? null,
        fav_sports: draft.fav_sports ?? [],
        notify_email: !!draft.notify_email,
        notify_whatsapp: !!draft.notify_whatsapp,
      });
      toast({ title: "Perfil guardado" });
    } catch (e: any) {
      toast({ title: "No se pudo guardar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Helmet>
        <title>Mi Perfil | Cancha Libre</title>
        <meta name="description" content="Configura tus datos y preferencias" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Mi Perfil</h1>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Datos personales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted">
                  {draft.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onAvatarPick(e.target.files?.[0])}
                  />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={saving}>
                    <Camera className="w-4 h-4 mr-2" /> Cambiar foto
                  </Button>
                  {draft.avatar_url && (
                    <Button variant="secondary" size="sm" onClick={() => patchDraft({ avatar_url: null })} disabled={saving}>
                      Quitar
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre completo</Label>
                  <Input
                    placeholder="Tu nombre"
                    value={draft.full_name ?? ""}
                    onChange={(e) => patchDraft({ full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user.email ?? ""} disabled />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <Input
                      placeholder="3884..."
                      value={draft.phone ?? ""}
                      onChange={(e) => patchDraft({ phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <Input
                      placeholder="5493884..."
                      value={draft.whatsapp ?? ""}
                      onChange={(e) => patchDraft({ whatsapp: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label>Ciudad</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <Input
                      placeholder="San Salvador de Jujuy"
                      value={draft.city ?? ""}
                      onChange={(e) => patchDraft({ city: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Deportes favoritos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sportsList.map((s) => {
                    const active = draft.fav_sports?.includes(s);
                    return (
                      <Badge
                        key={s}
                        className={`cursor-pointer ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                        onClick={() => onSelectSport(s)}
                      >
                        {s}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificaciones por Email</p>
                    <p className="text-sm text-muted-foreground">Confirmaciones y recordatorios</p>
                  </div>
                  <Switch
                    checked={!!draft.notify_email}
                    onCheckedChange={(v) => patchDraft({ notify_email: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificaciones por WhatsApp</p>
                    <p className="text-sm text-muted-foreground">Mensajes automáticos de la reserva</p>
                  </div>
                  <Switch
                    checked={!!draft.notify_whatsapp}
                    onCheckedChange={(v) => patchDraft({ notify_whatsapp: v })}
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={onSave} disabled={saving || loading}>
                  <Save className="w-4 h-4 mr-2" /> Guardar cambios
                </Button>
                <Button variant="outline" onClick={() => resetDraft()} disabled={saving || loading}>
                  Restablecer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Profile;
