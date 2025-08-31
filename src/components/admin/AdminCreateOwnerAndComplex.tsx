// src/components/admin/AdminCreateOwnerAndComplex.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminCreateOwnerAndComplex() {
  const [loading, setLoading] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultLink(null);
    setError("");

    try {
      const res = await fetch('/api/admin/create-owner-and-complex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: { email: ownerEmail, full_name: ownerName },
          complex: { name, address, neighborhood, phone, website, whatsapp, description }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear');
      setResultLink(data.recovery_link || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Correo del propietario</Label>
            <Input value={ownerEmail} onChange={(e)=>setOwnerEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Nombre del propietario</Label>
            <Input value={ownerName} onChange={(e)=>setOwnerName(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Nombre del complejo</Label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input value={address} onChange={(e)=>setAddress(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Barrio</Label>
            <Input value={neighborhood} onChange={(e)=>setNeighborhood(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e)=>setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e)=>setWebsite(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? 'Creando…' : 'Crear propietario + complejo'}</Button>
          </div>
        </form>

        {error && <p className="text-destructive text-sm">{error}</p>}
        {resultLink && (
          <div className="text-sm p-3 rounded bg-muted">
            <b>Link de recuperación:</b> <a className="text-primary underline" href={resultLink} target="_blank" rel="noreferrer">{resultLink}</a>
            <div>Compártelo al propietario para que establezca su contraseña.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
