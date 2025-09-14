import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type NavTab = "dashboard" | "reservations" | "notifications" | "plus";

type AppState = {
  // Preferencias UI
  selectedSport: string;         // "todos" | "fútbol" | ...
  mapView: "roadmap" | "satellite";
  isMapFullscreen: boolean;
  ownerSetupDraft: {
    ownerName?: string;
    ownerPhone?: string;
    complexName?: string;
    complexWhatsapp?: string;
    complexAddress?: string;
    complexNeighborhood?: string;
    complexNotes?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  navbarTab: NavTab;

  // Acciones
  setSelectedSport: (s: string) => void;
  setMapView: (v: "roadmap" | "satellite") => void;
  setMapFullscreen: (v: boolean) => void;
  patchOwnerSetupDraft: (patch: Partial<AppState["ownerSetupDraft"]>) => void;
  resetOwnerSetupDraft: () => void;
  setNavbarTab: (t: NavTab) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedSport: "todos",
      mapView: "roadmap",
      isMapFullscreen: false,
      ownerSetupDraft: {},
      navbarTab: "dashboard",

      setSelectedSport: (s) => set({ selectedSport: s }),
      setMapView: (v) => set({ mapView: v }),
      setMapFullscreen: (v) => set({ isMapFullscreen: v }),
      patchOwnerSetupDraft: (patch) =>
        set((st) => ({ ownerSetupDraft: { ...st.ownerSetupDraft, ...patch } })),
      resetOwnerSetupDraft: () => set({ ownerSetupDraft: {} }),
      setNavbarTab: (t) => set({ navbarTab: t }),
    }),
    {
      name: "app-store",
      storage: createJSONStorage(() => localStorage),
      // si querés migraciones de versión:
      // version: 1,
    }
  )
);
