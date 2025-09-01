// src/pages/RegisterCourtPage.tsx
import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { TablesInsert } from "@/types/supabase"  // ⬅ tu archivo de tipos
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "react-toastify"

type DayKey = 0|1|2|3|4|5|6
const DAYS: { key: DayKey; label: string }[] = [
  { key: 0, label: "Domingo" }, { key: 1, label: "Lunes" }, { key: 2, label: "Martes" },
  { key: 3, label: "Miércoles" }, { key: 4, label: "Jueves" }, { key: 5, label: "Viernes" },
  { key: 6, label: "Sábado" },
]

export default function RegisterCourtPage() {
  const [sp] = useSearchParams()
  const complexId = sp.get("complex_id") || ""
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  // form
  const [name, setName] = useState("")
  const [sport, setSport] = useState<"futbol"|"basquet"|"tenis"|"voley"|"handball"|"skate">("futbol")
  const [playersCapacity, setPlayersCapacity] = useState<number>(10)
  const [surfaceType, setSurfaceType] = useState<string>("")
  const [hasLighting, setHasLighting] = useState(false)
  const [hasRoof, setHasRoof] = useState(false)
  const [hourlyPrice, setHourlyPrice] = useState<number>(0)

  // disponibilidad semanal
  const [week, setWeek] = useState<Record<DayKey, { enabled: boolean; start: string; end: string }>>({
    0: { enabled: false, start: "09:00", end: "21:00" },
    1: { enabled: true,  start: "09:00", end: "21:00" },
    2: { enabled: true,  start: "09:00", end: "21:00" },
    3: { enabled: true,  start: "09:00", end: "21:00" },
    4: { enabled: true,  start: "09:00", end: "21:00" },
    5: { enabled: true,  start: "09:00", end: "23:00" },
    6: { enabled: true,  start: "09:00", end: "23:00" },
  })

  useEffect(() => {
    if (loading && !user) {
      toast.info("Iniciá sesión para registrar una cancha.")
      navigate("/auth")
    }
  }, [loading, user, navigate])

  const canSubmit = useMemo(
    () => !!complexId && name.trim().length >= 2 && hourlyPrice >= 0,
    [complexId, name, hourlyPrice]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    try {
      // 1) Insert sport_courts
      const courtPayload: TablesInsert<"sport_courts"> = {
        complex_id: complexId,
        name,
        sport,
        players_capacity: playersCapacity,
        surface_type: surfaceType || null,
        has_lighting: hasLighting,
        has_roof: hasRoof,
        hourly_price: hourlyPrice,
        is_active: true,
        photos: null,
      }

      const { data: created, error: e1 } = await supabase
        .from("sport_courts")
        .insert(courtPayload)
        .select("id")
        .single()
      if (e1) throw e1

      // 2) Upsert disponibilidad semanal
      const rows: TablesInsert<"court_availability">[] = Object.values(DAYS).map(({ key }) => ({
        court_id: created!.id,
        day_of_week: key,
        start_time: week[key].start,
        end_time: week[key].end,
        is_available: week[key].enabled,
      }))

      const { error: e2 } = await supabase.from("court_availability").upsert(rows)
      if (e2) throw e2

      toast.success("Cancha creada con su disponibilidad.")
      navigate("/dashboard")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ?? "Error al crear la cancha")
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-bold mb-6">Registrar nueva cancha</h1>

      {!complexId && (
        <p className="mb-6 text-red-600">
          Falta el <code>complex_id</code> en la URL.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cancha 1" />
          </div>

          <div>
            <Label>Deporte</Label>
            <Select value={sport} onValueChange={(v) => setSport(v as any)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="futbol">Fútbol</SelectItem>
                <SelectItem value="tenis">Tenis</SelectItem>
                <SelectItem value="basquet">Básquet</SelectItem>
                <SelectItem value="voley">Vóley</SelectItem>
                <SelectItem value="handball">Handball</SelectItem>
                <SelectItem value="skate">Skate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Capacidad de jugadores</Label>
            <Input type="number" value={playersCapacity}
              onChange={(e) => setPlayersCapacity(parseInt(e.target.value || "0", 10))} />
          </div>

          <div>
            <Label>Tipo de superficie</Label>
            <Input value={surfaceType} onChange={(e) => setSurfaceType(e.target.value)} placeholder="Césped sintético" />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={hasLighting} onCheckedChange={(v) => setHasLighting(Boolean(v))} />
            <Label className="cursor-pointer">Iluminación</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={hasRoof} onCheckedChange={(v) => setHasRoof(Boolean(v))} />
            <Label className="cursor-pointer">Techo</Label>
          </div>

          <div className="md:col-span-2">
            <Label>Precio por hora (ARS)</Label>
            <Input type="number" value={hourlyPrice}
              onChange={(e) => setHourlyPrice(parseFloat(e.target.value || "0"))} />
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Disponibilidad semanal</h2>
          <div className="space-y-3">
            {DAYS.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-[1fr_120px_120px] items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={week[key].enabled}
                    onCheckedChange={(v) => setWeek((w) => ({ ...w, [key]: { ...w[key], enabled: Boolean(v) } }))}
                  />
                  <span className="min-w-24">{label}</span>
                </div>
                <Input type="time" value={week[key].start}
                  onChange={(e) => setWeek((w) => ({ ...w, [key]: { ...w[key], start: e.target.value } }))} />
                <Input type="time" value={week[key].end}
                  onChange={(e) => setWeek((w) => ({ ...w, [key]: { ...w[key], end: e.target.value } }))} />
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={!canSubmit} className="bg-gradient-sport">Crear cancha</Button>
      </form>
    </div>
  )
}
