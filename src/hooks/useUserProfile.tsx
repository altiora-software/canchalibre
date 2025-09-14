import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type UserProfile = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  city: string | null;
  fav_sports: string[] | null;
  notify_email: boolean | null;
  notify_whatsapp: boolean | null;
};

export const useUserProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const getMyProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id,email,full_name,phone,whatsapp,avatar_url,city,fav_sports,notify_email,notify_whatsapp"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }
    return (data as any as UserProfile) ?? null;
  }, [user, toast]);

  const updateMyProfile = useCallback(
    async (payload: Partial<UserProfile>) => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: payload.full_name ?? null,
          phone: payload.phone ?? null,
          whatsapp: payload.whatsapp ?? null,
          avatar_url: payload.avatar_url ?? null,
          city: payload.city ?? null,
          fav_sports: payload.fav_sports ?? [],
          notify_email: payload.notify_email ?? true,
          notify_whatsapp: payload.notify_whatsapp ?? true,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      return true;
    },
    [user]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) throw new Error("No autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
  
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
  
      if (upErr) throw upErr;
  
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      return pub.publicUrl;
    },
    [user]
  );

  
  return { getMyProfile, updateMyProfile, uploadAvatar };
};
