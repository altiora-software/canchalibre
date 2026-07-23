import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Notification = {
  id: string;
  kind: "new_web_reservation" | "owner_manual_reservation";
  read_at: string | null;
  reservation_date: string;
  start_time: string;
  end_time: string;
  court_name: string;
  guest_name: string | null;
};

export default function OwnerNotifications({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase.rpc as any)("get_owner_notifications");
      setItems((data ?? []) as Notification[]);
      setLoading(false);
    };
    void load();
  }, [refreshKey]);

  const markRead = async (id: string) => {
    const { error } = await (supabase.rpc as any)("mark_owner_notification_read", { p_notification_id: id });
    if (!error) setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  };

  const unread = items.filter((item) => !item.read_at).length;
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Notificaciones{unread > 0 ? ` (${unread})` : ""}</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : items.length === 0 ? <p className="text-sm text-muted-foreground">No tenes notificaciones.</p> : items.slice(0, 8).map((item) => <div key={item.id} className="border rounded-md p-3 flex gap-3 justify-between">
        <div><p className="font-medium">{item.kind === "new_web_reservation" ? "Nueva reserva web" : "Reserva manual registrada"}</p><p className="text-sm text-muted-foreground">{item.court_name} · {item.reservation_date} · {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}{item.guest_name ? ` · ${item.guest_name}` : ""}</p></div>
        {!item.read_at && <Button size="sm" variant="outline" onClick={() => void markRead(item.id)}>Leida</Button>}
      </div>)}
    </CardContent>
  </Card>;
}
