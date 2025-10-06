import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ProfileDraft = {
  full_name?: string;
  phone?: string;
  whatsapp?: string;
  avatar_url?: string | null;
  city?: string;
  fav_sports?: string[];          // ["fútbol","tenis",...]
  notify_email?: boolean;
  notify_whatsapp?: boolean;
};

type ProfileState = {
  draft: ProfileDraft;
  setDraft: (draft: ProfileDraft) => void;
  patchDraft: (p: Partial<ProfileDraft>) => void;
  resetDraft: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      draft: {
        fav_sports: [],
        notify_email: true,
        notify_whatsapp: true,
      },
      setDraft: (draft) => set({ draft }),
      patchDraft: (p) =>
        set((s) => ({ draft: { ...s.draft, ...p } })),
      resetDraft: () =>
        set({
          draft: {
            fav_sports: [],
            notify_email: true,
            notify_whatsapp: true,
          },
        }),

      loading: false,
      setLoading: (v) => set({ loading: v }),
    }),
    {
      name: "profile-draft",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
