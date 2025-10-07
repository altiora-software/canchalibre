import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// @ts-ignore
import {Badge} from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";  
import { CardHeader } from "@/components/ui/card";  
import { CardTitle } from "@/components/ui/card";  
import { CardDescription } from "@/components/ui/card";  
import {Button} from "@/components/ui/button";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface OwnerReservation {
  id: string;
  user_id: string;
  complex_id: string;
  court_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_price?: number;
  payment_status: "pending" | "approved" | "cancelled" | "paid";
  sport_complexes?: { id: string; name: string; owner_id: string };
  sport_courts?: { name: string; sport: string };
}

export default function ReservationsSection({ reservations, setReservations, resLoading }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Filtrar reservas del día seleccionado
  const filteredReservations = selectedDate
    ? reservations.filter(
        (r) => new Date(r.reservation_date).toDateString() === selectedDate.toDateString()
      )
    : reservations;

  const updateReservationStatus = async (id: string, newStatus: OwnerReservation["payment_status"]) => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .update({ payment_status: newStatus })
        .eq("id", id);

      if (error) throw error;

      // Actualizamos localmente
      setReservations((prev: OwnerReservation[]) =>
        prev.map((r) => (r.id === id ? { ...r, payment_status: newStatus } : r))
      );
    } catch (err) {
      console.error("Error actualizando reserva:", err);
    }
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Reservas</CardTitle>
          <CardDescription>Calendario de reservas en tus complejos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resLoading ? (
            <div className="py-10 text-center">Cargando reservas…</div>
          ) : reservations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Aún no hay reservas</div>
          ) : (
            <>
              {/* CALENDARIO */}
              <div className="w-full max-w-md mx-auto">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiersClassNames={{
                    selected: "bg-blue-600 text-white rounded-full",
                  }}
                  className="w-full"
                />
              </div>

              {/* RESERVAS DEL DÍA */}
              <div className="space-y-3">
                {filteredReservations.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{r.sport_complexes?.name}</span>{" "}
                          · <span>{r.sport_courts?.name}</span> ({r.sport_courts?.sport})
                        </div>
                        <Badge
                          variant={
                            r.payment_status === "approved"
                              ? "default"
                              : r.payment_status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {r.payment_status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                        </span>
                        <span>{r.total_price ? `$${r.total_price}` : "-"}</span>
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {r.payment_status !== "approved" && (
                          <Button
                            size="sm"
                            onClick={() => updateReservationStatus(r.id, "approved")}
                          >
                            Aprobar
                          </Button>
                        )}
                        {r.payment_status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateReservationStatus(r.id, "cancelled")}
                          >
                            Cancelar
                          </Button>
                        )}
                        {r.payment_status !== "pending" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updateReservationStatus(r.id, "pending")}
                          >
                            Marcar pendiente
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
