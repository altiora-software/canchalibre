import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
  forceRole?: 'customer' | 'owner';
}

export const RoleSelectionModal = ({ isOpen, onClose, userEmail, userName, forceRole }: RoleSelectionModalProps) => {
  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update user metadata with the selected role
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role: role,
          phone: phone,
          full_name: userName
        }
      });

      if (updateError) throw updateError;

      // Create or update the profile in the database (upsert)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            role: forceRole || role,
            phone: phone,
            full_name: userName,
            email: userEmail
          }, {
            onConflict: 'user_id'
          });

        if (profileError) throw profileError;
      }

      toast({
        title: "¡Perfil completado!",
        description: "Tu cuenta ha sido configurada exitosamente.",
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Completa tu perfil</DialogTitle>
          <DialogDescription>
            Por favor selecciona tu tipo de usuario para completar el registro.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-display">Email</Label>
            <Input
              id="email-display"
              type="email"
              value={userEmail}
              disabled
              className="bg-muted"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name-display">Nombre</Label>
            <Input
              id="name-display"
              type="text"
              value={userName}
              disabled
              className="bg-muted"
            />
          </div>

        {!forceRole && (
          <div className="space-y-2">
            <Label htmlFor="role">Tipo de Usuario</Label>
            <Select value={role} onValueChange={(value: 'customer' | 'owner') => setRole(value)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Cliente</span>
                    <span className="text-xs text-muted-foreground">Reservar canchas deportivas</span>
                  </div>
                </SelectItem>
                <SelectItem value="owner">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Propietario de Complejo</span>
                    <span className="text-xs text-muted-foreground">Gestionar mi complejo deportivo</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {forceRole && (
          <div className="space-y-2">
            <Label>Tipo de Usuario</Label>
            <div className="p-3 bg-muted rounded-md">
              <div className="flex flex-col">
                <span className="font-medium">
                  {forceRole === 'owner' ? 'Propietario de Complejo' : 'Cliente'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {forceRole === 'owner' ? 'Gestionar mi complejo deportivo' : 'Reservar canchas deportivas'}
                </span>
              </div>
            </div>
          </div>
        )}

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="388-123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Guardando..." : "Completar Registro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};