import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Camera, Save, User, Phone, MapPin, Mail, ArrowLeft } from "lucide-react";

const sportsList = ["fútbol", "tenis", "básquet", "vóley", "pádel", "handball", "skate", "padle"];

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

  // Local file state for preview & upload-on-save
  const [localAvatarFile, setLocalAvatarFile] = useState<File | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
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
      } catch (e: any) {
        toast({ title: "Error cargando perfil", description: e?.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // cleanup preview url on unmount or when local file changes
    return () => {
      if (localAvatarPreview) URL.revokeObjectURL(localAvatarPreview);
    };
  }, [localAvatarPreview]);

  const onSelectSport = (s: string) => {
    const list = new Set(draft.fav_sports || []);
    list.has(s) ? list.delete(s) : list.add(s);
    patchDraft({ fav_sports: Array.from(list) });
  };

  const handleFileChange = (file?: File | null) => {
    if (!file) return;
    // preview
    const url = URL.createObjectURL(file);
    setLocalAvatarFile(file);
    setLocalAvatarPreview(url);
  };

  // Option A: upload avatar immediately when selected (keep for quick upload UX)
  const onAvatarPickImmediate = async (file?: File | null) => {
    if (!file) return;
    setSaving(true);
    try {
      // uploadAvatar should return the URL of the stored avatar
      const url = await uploadAvatar(file);
      patchDraft({ avatar_url: url });
      setLocalAvatarFile(null);
      setLocalAvatarPreview(null);
      toast({ title: "Avatar actualizado" });
    } catch (e: any) {
      toast({ title: "Error subiendo avatar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // We'll use this handler for the <input> change: set preview AND choose strategy
  const onAvatarInput = (file?: File | null) => {
    handleFileChange(file);
    // If you want immediate upload uncomment the next line (and comment upload-on-save)
    // onAvatarPickImmediate(file);
  };

  // Save: if user chose a local file and we haven't uploaded it yet, upload now and include returned URL in profile update
  const onSave = async () => {
    try {
      setSaving(true);

      let avatar_url_to_save = draft.avatar_url ?? null;

      if (localAvatarFile) {
        // uploadAvatar should return URL/string
        try {
          const url = await uploadAvatar(localAvatarFile);
          avatar_url_to_save = url;
        } catch (e: any) {
          // if avatar upload fails, inform and stop saving to avoid partial updates
          toast({ title: "Error subiendo avatar", description: e?.message, variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      await updateMyProfile({
        full_name: draft.full_name ?? "",
        phone: (draft.phone || "").replace(/\D/g, ""),
        whatsapp: (draft.whatsapp || "").replace(/\D/g, ""),
        avatar_url: avatar_url_to_save,
        city: draft.city ?? null,
        fav_sports: draft.fav_sports ?? [],
        notify_email: !!draft.notify_email,
        notify_whatsapp: !!draft.notify_whatsapp,
      });

      // after successful save, clear local preview + file
      setLocalAvatarFile(null);
      if (localAvatarPreview) {
        URL.revokeObjectURL(localAvatarPreview);
        setLocalAvatarPreview(null);
      }

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

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Mi Perfil</h1>
              <p className="text-sm text-muted-foreground">Edita tus datos y preferencias</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Volver al inicio
                </Link>
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Datos personales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  {localAvatarPreview ? (
                    // preview chosen file
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={localAvatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                  ) : draft.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground">
                      {/* <AvatarFallback className="bg-transparent text-muted-foreground">
                        <User className="w-7 h-7" />
                      </AvatarFallback> */}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onAvatarInput(e.target.files?.[0] ?? null)}
                      aria-label="Subir avatar"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={saving || loading}
                    >
                      <Camera className="w-4 h-4 mr-2" /> Cambiar foto
                    </Button>

                    { (draft.avatar_url || localAvatarPreview) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setLocalAvatarFile(null);
                          if (localAvatarPreview) {
                            URL.revokeObjectURL(localAvatarPreview);
                            setLocalAvatarPreview(null);
                          }
                          patchDraft({ avatar_url: null });
                        }}
                        disabled={saving || loading}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Tip: PNG/JPEG hasta 5MB. Si no querés subir ahora, podés seleccionar la imagen y se guardará al presionar
                    "Guardar cambios".
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre completo</Label>
                  <Input
                    placeholder="Tu nombre"
                    value={draft.full_name ?? ""}
                    onChange={(e) => patchDraft({ full_name: e.target.value })}
                    disabled={saving || loading}
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
                      disabled={saving || loading}
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
                      disabled={saving || loading}
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
                      disabled={saving || loading}
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
                        className={`cursor-pointer select-none px-3 py-1 rounded-full text-sm ${
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                        onClick={() => onSelectSport(s)}
                        aria-pressed={active}
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
                    disabled={saving || loading}
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
                    disabled={saving || loading}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={onSave} disabled={saving || loading}>
                  <Save className="w-4 h-4 mr-2" /> {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button variant="outline" onClick={() => resetDraft()} disabled={saving || loading}>
                  Restablecer
                </Button>
                <Button variant="ghost" onClick={() => navigate("/")} disabled={saving || loading}>
                  Volver al inicio
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
