// OwnerComplexPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { MapPin, UploadCloud, Trash2, Edit2, Calendar, Plus } from "lucide-react";

import ReservationsCalendar from "@/components/reservationsSection/ReservationsCalendar";
import CreateReservationModal, { OwnerReservation as ModalOwnerReservation } from "@/components/reservationsSection/CreateReservation";

/** Types */
type CourtForm = {
  id?: string; // present if already persisted
  name: string;
  sport: string;
  playersCapacity: number;
  surfaceType?: string;
  hasLighting?: boolean;
  hasRoof?: boolean;
  hourlyPrice?: number;
};

type CourtDB = {
  id: string;
  name: string;
  sport: string;
  players_capacity?: number;
  surface_type?: string;
  has_lighting?: boolean;
  has_roof?: boolean;
  hourly_price?: number;
  complex_id?: string;
};

type ComplexShape = {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  photos?: string[] | null;
  amenities?: string[] | null;
  is_active?: boolean;
  payment_status?: string | null;
  sport_courts?: CourtDB[] | null;
  created_at?: string;
  updated_at?: string;
};

/** Sports options for select — ajustá si tenés otra lista */
const sportsOptions = [
  { value: "padle", label: "Paddle / Padel" },
  { value: "tennis", label: "Tenis" },
  { value: "futbol", label: "Fútbol" },
  { value: "basket", label: "Básquet" },
];

export default function OwnerComplexPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const [complex, setComplex] = useState<ComplexShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOwnership, setCheckingOwnership] = useState(true);

  // form / editing
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<ComplexShape>>({});

  // courts local state (forms)
  const [courts, setCourts] = useState<CourtForm[]>([]); // includes persisted (with id) and new ones (no id)
  const [currentCourt, setCurrentCourt] = useState<CourtForm>({
    name: "",
    sport: sportsOptions[0].value,
    playersCapacity: 4,
    surfaceType: "",
    hasLighting: false,
    hasRoof: false,
    hourlyPrice: 0,
  });

  // photos / gallery
  const [uploading, setUploading] = useState(false);

  // reservations/calendar
  const [reservations, setReservations] = useState<any[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // --- Fetch complex + courts ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("sport_complexes")
        .select("*, sport_courts(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("fetch complex error:", error);
        toast({ title: "Error", description: "No se pudo cargar el complejo", variant: "destructive" });
        setComplex(null);
        setForm({});
        setLoading(false);
        return;
      }

      if (!cancelled && data) {
        const normalized: ComplexShape = {
          id: data.id,
          owner_id: data.owner_id,
          name: data.name,
          description: data.description,
          address: data.address,
          neighborhood: data.neighborhood,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          website: data.website,
          photos: data.photos ?? [],
          amenities: data.amenities ?? [],
          is_active: data.is_active,
          payment_status: data.payment_status,
          sport_courts: data.sport_courts ?? [],
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setComplex(normalized);
        setForm(normalized);
        // fill courts state from sport_courts
        const cts: CourtForm[] = (data.sport_courts ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          sport: c.sport,
          playersCapacity: c.players_capacity ?? 4,
          surfaceType: c.surface_type ?? "",
          hasLighting: c.has_lighting ?? false,
          hasRoof: c.has_roof ?? false,
          hourlyPrice: c.hourly_price ?? 0,
        }));
        setCourts(cts);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, toast]);

  // ownership check
  useEffect(() => {
    if (profileLoading || loading) { setCheckingOwnership(true); return; }

    if (!user) {
      toast({ title: "Acceso", description: "Debes iniciar sesión.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!profile) {
      toast({ title: "Perfil", description: "Completa tu perfil.", variant: "destructive" });
      navigate("/profile");
      return;
    }
    if (!complex) {
      toast({ title: "Complejo", description: "Complejo no encontrado.", variant: "destructive" });
      navigate("/");
      return;
    }
    if (complex.owner_id && profile.id && complex.owner_id !== profile.id) {
      toast({ title: "Acceso denegado", description: "No sos el dueño de este complejo.", variant: "destructive" });
      navigate("/");
      return;
    }
    setCheckingOwnership(false);
  }, [profileLoading, loading, user, profile, complex, navigate, toast]);

  // --- Courts actions (local) ---
  const addCourt = () => {
    // validate
    if (!currentCourt.name?.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresa un nombre para la cancha", variant: "destructive" });
      return;
    }
    setCourts(prev => [...prev, { ...currentCourt }]);
    // reset currentCourt
    setCurrentCourt({
      name: "",
      sport: sportsOptions[0].value,
      playersCapacity: 4,
      surfaceType: "",
      hasLighting: false,
      hasRoof: false,
      hourlyPrice: 0,
    });
    toast({ title: "Cancha agregada", description: "Se agregó la cancha a la lista (aún no guardada)" });
  };

  const removeCourtLocal = (index: number) => {
    const c = courts[index];
    // If persisted (has id), confirm deletion and call delete endpoint
    if (c.id) {
      if (!confirm("Eliminar cancha permanentemente?")) return;
      // delete from DB and update state
      (async () => {
        const { error } = await supabase.from("sport_courts").delete().eq("id", c.id);
        if (error) {
          console.error("delete court error", error);
          toast({ title: "Error", description: "No se pudo eliminar cancha", variant: "destructive" });
          return;
        }
        setCourts(prev => prev.filter((_, i) => i !== index));
        toast({ title: "Cancha eliminada", description: "La cancha fue borrada" });
      })();
    } else {
      // just remove from local list
      setCourts(prev => prev.filter((_, i) => i !== index));
      toast({ title: "Cancha eliminada", description: "Se quitó la cancha de la lista" });
    }
  };

  // bulk persist courts to DB: update existing, insert new
  const syncCourtsToDB = async () => {
    if (!complex) return;
    try {
      // update existing (those with id)
      const toUpdate = courts.filter(c => c.id).map(c => ({
        id: c.id,
        name: c.name,
        sport: c.sport,
        players_capacity: c.playersCapacity,
        surface_type: c.surfaceType,
        has_lighting: c.hasLighting,
        has_roof: c.hasRoof,
        hourly_price: c.hourlyPrice,
        complex_id: complex.id,
      }));

    //   for (const u of toUpdate) {
    //     const { error } = await supabase.from("sport_courts").update(u).eq("id", u.id);
    //     if (error) console.warn("update court error", error);
    //   }

      // insert new (no id)
      const toInsert = courts.filter(c => !c.id).map(c => ({
        complex_id: complex.id,
        name: c.name,
        sport: c.sport,
        players_capacity: c.playersCapacity,
        surface_type: c.surfaceType,
        has_lighting: c.hasLighting,
        has_roof: c.hasRoof,
        hourly_price: c.hourlyPrice,
      }));
    //   if (toInsert.length > 0) {
    //     const { error } = await supabase.from("sport_courts").insert(toInsert);
    //     if (error) throw error;
    //   }

      // refresh complex.sport_courts
      const { data } = await supabase
        .from("sport_complexes")
        .select("*, sport_courts(*)")
        .eq("id", complex.id)
        .maybeSingle();

      if (data) {
        // Aseguramos que el objeto resultante cumpla con ComplexShape (id requerido)
        setComplex(prev => {
          if (!prev) return prev; // Si prev es null o undefined, no actualizamos
          return { ...prev, ...data, sport_courts: data.sport_courts ?? [] };
        });
        // refill courts state from DB
        const cts = (data.sport_courts ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          sport: c.sport,
          playersCapacity: c.players_capacity ?? 4,
          surfaceType: c.surface_type ?? "",
          hasLighting: c.has_lighting ?? false,
          hasRoof: c.has_roof ?? false,
          hourlyPrice: c.hourly_price ?? 0,
        }));
        setCourts(cts);
      }
      toast({ title: "Canchas sincronizadas", description: "Canchas guardadas correctamente" });
    } catch (err: any) {
      console.error("sync courts error", err);
      toast({ title: "Error", description: err?.message ?? String(err), variant: "destructive" });
    }
  };

  const [localPhotos, setLocalPhotos] = useState<(File | string)[]>(form.photos ?? complex?.photos ?? []);

  // --- Photos upload/delete ---
  const handleUploadPhoto = async (file: File) => {
    if (!complex || !profile) return;
    if (complex.owner_id !== profile.id) {
      toast({ title: "No permitido", description: "No sos el propietario", variant: "destructive" });
      return;
    }
  
    setUploading(true);
  
    try {
      // Generar nombre único
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}.${ext}`;
      const path = `${complex.id}/${filename}`;
  
      // Subir a Storage
      const { error: upErr } = await supabase.storage.from("complex-photos").upload(path, file, { upsert: true });

      if (upErr) throw upErr;
  
      // Obtener URL pública
      const { data } = supabase.storage.from("complex-photos").getPublicUrl(path);
      const publicUrl = data.publicUrl;
  
      // Actualizar array de fotos
      const updatedPhotos = [...(form.photos ?? complex.photos ?? []), publicUrl];
  
      // Preparamos payload con todos los campos del form + fotos actualizadas
      const payload: Partial<ComplexShape> = {
        ...form,       // todos los demás campos editables del complejo
        photos: updatedPhotos, // reemplazamos solo el array de fotos
      };
  
      // Actualizar en DB
      const { error } = await supabase.from("sport_complexes").update(payload).eq("id", complex.id);
      if (error) throw error;
  
      // Actualizar estado local
      setForm(prev => ({ ...(prev ?? {}), photos: updatedPhotos }));
      setComplex(prev => prev ? ({ ...prev, photos: updatedPhotos }) : prev);
  
      toast({ title: "Foto subida", description: "Imagen agregada a la galería." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };
  
  const handleAddPhoto = (file: File) => {
    setLocalPhotos(prev => [...prev, file]);
  };
  
  // Eliminar foto del estado local
  const handleRemovePhoto = (index: number) => {
    setLocalPhotos(prev => prev.filter((_, i) => i !== index));
  };


  const handleDeletePhoto = async (index: number) => {
    if (!complex || !profile) return;
    if (!confirm("Eliminar esta foto?")) return;
    const photos = form.photos ?? complex.photos ?? [];
    const newPhotos = photos.filter((_, i) => i !== index);
    const { error } = await supabase.from("sport_complexes").update({ photos: newPhotos }).eq("id", complex.id);
    if (error) { toast({ title: "Error", description: "No se pudo actualizar galería.", variant: "destructive" }); return; }
    setForm(prev => ({ ...(prev ?? {}), photos: newPhotos }));
    setComplex(prev => prev ? ({ ...prev, photos: newPhotos }) : prev);
    toast({ title: "Foto eliminada" });
  };

  // --- Save complex (basic fields) ---
  const saveComplex = async () => {
    if (!complex || !profile) return;
    if (complex.owner_id !== profile.id) {
      toast({ title: "No permitido", description: "No sos el propietario", variant: "destructive" });
      return;
    }
  
    setLoading(true);
  
    try {
      setUploading(true);
  
      // Subir nuevas fotos a Storage
      const uploadedUrls: string[] = [];
      for (const photo of localPhotos) {
        if (typeof photo === "string") {
          uploadedUrls.push(photo); // ya subida
        } else {
          const ext = photo.name.split(".").pop();
          const filename = `${Date.now()}-${photo.name}`;
          const path = `${complex.id}/${filename}`;
          const { error } = await supabase.storage.from("complex-photos").upload(path, photo, { upsert: true });
          if (error) throw error;
          const { data } = supabase.storage.from("complex-photos").getPublicUrl(path);
          uploadedUrls.push(data.publicUrl);
        }
      }
  
      // Payload final del complejo
      const payload: Partial<ComplexShape> = {
        ...form,
        photos: uploadedUrls,
      };
  
      const { data, error } = await supabase
        .from("sport_complexes")
        .update(payload)
        .eq("id", complex.id)
        .select()
        .maybeSingle();
  
      if (error) throw error;
  
      if (data) {
        setForm(data);
        setComplex(data);
        setLocalPhotos(data.photos ?? []);
      }
      setEditing(false);
  
      // Sincronizar canchas
      await syncCourtsToDB();
  
      toast({ title: "Guardado", description: "Cambios guardados correctamente." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };
  

  // --- Reservations (rpc) ---
  const loadReservations = async () => {
    if (!profile) return;
    setResLoading(true);
    try {
      // Corregido: pasar el owner_uuid correctamente desde el perfil
      const { data, error } = await supabase.rpc<any, any>("get_reservations_by_owner", {
        owner_uuid: complex.owner_id  
      });
      if (error) {
        console.error("RPC error", error);
        setReservations([]);
      } else setReservations(Array.isArray(data) ? data : []);
    // Corregido: asegurar que setReservations reciba un array
    } catch (err) {
      console.error(err);
      setReservations([]);
    } finally { setResLoading(false); }
  };

  const handleCreatedReservation = (res: ModalOwnerReservation) => {
    setReservations(prev => [{ ...res }, ...prev]);
    toast({ title: "Reserva creada", description: "Se agregó la reserva al calendario." });
  };

  if (profileLoading || loading || checkingOwnership) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div>Comprobando permisos y cargando datos…</div>
      </div>
    );
  }

  if (!complex) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{complex.name}</h1>
            <div className="text-sm text-muted-foreground">{complex.address} · {complex.neighborhood}</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateModalOpen(true)}><Calendar className="w-4 h-4 mr-2" />Nueva reserva</Button>
            {!editing && <Button variant="outline" onClick={() => { setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Edit2 className="w-4 h-4 mr-2" />Editar</Button>}
            {editing && <Button variant="ghost" onClick={() => { setEditing(false); setForm(complex); }}>Cancelar</Button>}
            {editing && <Button onClick={saveComplex}>Guardar</Button>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: gallery + about + amenities + courts form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Gallery */}
            <Card>
                <CardHeader><CardTitle>Galería</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                    {localPhotos.map((p, idx) => {
                        const src = typeof p === "string" ? p : URL.createObjectURL(p);
                        return (
                        <div key={idx} className="relative">
                            <img src={src} alt={`photo-${idx}`} className="w-56 h-40 object-cover rounded-md" />
                            {complex.owner_id === profile!.id && (
                            <button
                                className="absolute top-2 right-2 bg-white/90 rounded p-1"
                                onClick={() => handleRemovePhoto(idx)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            )}
                        </div>
                        );
                    })}
                    {complex.owner_id === profile!.id && (
                        <label className="w-56 h-40 flex items-center justify-center border border-dashed rounded-md cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAddPhoto(f);
                            }}
                        />
                        <div className="text-center">
                            <UploadCloud className="mx-auto" />
                            <div className="text-sm mt-1">{uploading ? "Subiendo..." : "Agregar foto"}</div>
                        </div>
                        </label>
                    )}
                    </div>
                </CardContent>
                </Card>

            {/* About */}
            <Card>
              <CardHeader><CardTitle>Acerca del complejo</CardTitle></CardHeader>
              <CardContent>
                {editing ? (
                  <div className="grid grid-cols-1 gap-3">
                    <Input value={form.name ?? ""} onChange={(e:any) => setForm(prev => ({ ...(prev ?? {}), name: e.target.value }))} placeholder="Nombre del complejo" />
                    <Input value={form.address ?? ""} onChange={(e:any) => setForm(prev => ({ ...(prev ?? {}), address: e.target.value }))} placeholder="Dirección" />
                    <Input value={form.neighborhood ?? ""} onChange={(e:any) => setForm(prev => ({ ...(prev ?? {}), neighborhood: e.target.value }))} placeholder="Barrio" />
                    <Input value={form.phone ?? ""} onChange={(e:any) => setForm(prev => ({ ...(prev ?? {}), phone: e.target.value }))} placeholder="Teléfono" />
                    <Input value={form.whatsapp ?? ""} onChange={(e:any) => setForm(prev => ({ ...(prev ?? {}), whatsapp: e.target.value }))} placeholder="WhatsApp" />
                    <Input value={form.website ?? ""} onChange={(e:any) => setForm(prev => ({ ...(prev ?? {}), website: e.target.value }))} placeholder="Website" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>{complex.description}</div>
                    <div className="text-sm text-muted-foreground">Tel: {complex.phone ?? "—"}</div>
                    <div className="text-sm text-muted-foreground">WhatsApp: {complex.whatsapp ?? "—"}</div>
                    <div className="text-sm text-muted-foreground">Web: {complex.website ? <a href={complex.website} target="_blank" rel="noreferrer" className="underline">{complex.website}</a> : "—"}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(form.amenities ?? complex.amenities ?? []).map((a, i) => (
                    <Badge key={i} className="flex items-center gap-2">
                      {a}
                      {editing && <button className="ml-2 text-xs" onClick={() => setForm(prev => ({ ...(prev ?? {}), amenities: (prev?.amenities ?? complex.amenities ?? []).filter((_, idx) => idx !== i) }))}>x</button>}
                    </Badge>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <input id="newAmenity" className="border rounded px-2 py-1 flex-1" placeholder="Agregar servicio" />
                    <Button onClick={() => {
                      const el = document.getElementById("newAmenity") as HTMLInputElement | null;
                      const v = el?.value ?? "";
                      if (!v.trim()) return;
                      setForm(prev => ({ ...(prev ?? {}), amenities: [...(prev?.amenities ?? complex.amenities ?? []), v.trim()] }));
                      if (el) el.value = "";
                    }}><Plus /></Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Canchas - FORM + LIST */}
            <Card>
              <CardHeader>
                <CardTitle>Canchas</CardTitle>
                <CardDescription>Agrega todas las canchas de tu complejo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Formulario para agregar cancha */}
                <div className="p-4 border border-dashed border-muted-foreground/30 rounded-lg space-y-4">
                  <h4 className="font-medium">Agregar Nueva Cancha</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="court-name">Nombre de la Cancha</Label>
                      <Input
                        id="court-name"
                        value={currentCourt.name}
                        onChange={(e:any) => setCurrentCourt({ ...currentCourt, name: e.target.value })}
                        placeholder="Ej: Cancha 1, Cancha Principal"
                      />
                    </div>
                    <div>
                      <Label htmlFor="court-sport">Deporte</Label>
                      <Select
                        value={currentCourt.sport}
                        onValueChange={(value) => setCurrentCourt({ ...currentCourt, sport: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar deporte" />
                        </SelectTrigger>
                        <SelectContent>
                          {sportsOptions.map((sport) => (
                            <SelectItem key={sport.value} value={sport.value}>
                              {sport.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="players-capacity">Cantidad de Jugadores</Label>
                      <Select
                        value={String(currentCourt.playersCapacity)}
                        onValueChange={(value) => setCurrentCourt({ ...currentCourt, playersCapacity: parseInt(value.replace(/\D/g, "")) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 jugadores</SelectItem>
                          <SelectItem value="4">4 jugadores</SelectItem>
                          <SelectItem value="7">7 jugadores</SelectItem>
                          <SelectItem value="8">8 jugadores</SelectItem>
                          <SelectItem value="11">11 jugadores</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="surface-type">Tipo de Superficie</Label>
                      <Input
                        id="surface-type"
                        value={currentCourt.surfaceType}
                        onChange={(e:any) => setCurrentCourt({ ...currentCourt, surfaceType: e.target.value })}
                        placeholder="Ej: Césped sintético, Cemento"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly-price">Precio por Hora ($)</Label>
                      <Input
                        id="hourly-price"
                        type="number"
                        value={currentCourt.hourlyPrice}
                        onChange={(e:any) => setCurrentCourt({ ...currentCourt, hourlyPrice: parseFloat(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-lighting"
                        checked={currentCourt.hasLighting}
                        onCheckedChange={(checked:any) => setCurrentCourt({ ...currentCourt, hasLighting: Boolean(checked) })}
                      />
                      <Label htmlFor="has-lighting">Iluminación</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-roof"
                        checked={currentCourt.hasRoof}
                        onCheckedChange={(checked:any) => setCurrentCourt({ ...currentCourt, hasRoof: Boolean(checked) })}
                      />
                      <Label htmlFor="has-roof">Techada</Label>
                    </div>
                  </div>

                  <Button type="button" onClick={addCourt} className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Cancha
                  </Button>
                </div>

                {/* Lista de canchas agregadas */}
                {courts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Canchas Agregadas ({courts.length})</h4>
                    {courts.map((court, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <h5 className="font-medium">{court.name}</h5>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="secondary">
                              {sportsOptions.find(s => s.value === court.sport)?.label}
                            </Badge>
                            <Badge variant="outline">
                              {court.playersCapacity} jugadores
                            </Badge>
                            {court.hasLighting && <Badge variant="outline">Iluminación</Badge>}
                            {court.hasRoof && <Badge variant="outline">Techada</Badge>}
                            {court.hourlyPrice && court.hourlyPrice > 0 && (
                              <Badge variant="outline">${court.hourlyPrice}/hora</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => {
                            // quick edit: populate currentCourt with this court and remove from list
                            setCurrentCourt(court);
                            setCourts(prev => prev.filter((_, i) => i !== index));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCourtLocal(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => { setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Edit2 className="w-4 h-4 mr-2" />Editar Complejo</Button>
                  <Button onClick={() => { setIsCreateModalOpen(true); setTimeout(loadReservations, 400); }}><Calendar className="w-4 h-4 mr-2" />Crear reserva</Button>
                  <Button variant="outline" onClick={async () => { await syncCourtsToDB(); }}>Guardar canchas</Button>
                </div>
              </CardContent>
            </Card>

            {/* <Card>
                <CardHeader>
                    <CardTitle>Reservas (calendario)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="w-full rounded overflow-hidden bg-surface">
                    <div className="h-56 sm:h-72 md:h-80 lg:h-[420px] w-full">
                        <ReservationsCalendar
                        reservations={reservations}
                        setReservations={setReservations}
                        resLoading={resLoading}
                        @ts-ignore
                        />
                    </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Button onClick={loadReservations} className="w-full sm:w-auto">Actualizar reservas</Button>
                    <div className="text-sm text-muted-foreground ml-0 sm:ml-3">
                        {resLoading ? "Cargando..." : `${reservations.length ?? 0} reservas`}
                    </div>
                    </div>
                </CardContent>
            </Card> */}

          </div>
        </div>
      </div>

      <CreateReservationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        authUserId={user?.id ?? ""}
        onCreated={handleCreatedReservation}
      />
    </div>
  );
}
