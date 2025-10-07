import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { SuperAdminProvider } from "@/hooks/useSuperAdmin";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OwnersAuth from "./pages/OwnersAuth";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import RegisterComplex from "./pages/RegisterComplex";
import ComplexDetails from "./pages/ComplexDetails";
import Dashboard from "./pages/Dashboard";
import MyReservations from "./pages/MyReservations";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import OwnerComplexDetails from "./pages/OwnerComplexDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <AuthProvider>
        <SuperAdminProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/owners/auth" element={<OwnersAuth />} />
              <Route path="/register-complex" element={<RegisterComplex />} />
              <Route path="/complex/:id" element={<ComplexDetails />} />
              <Route path="/owner-complex/:id" element={<OwnerComplexDetails />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-reservations" element={<MyReservations />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/superadmin" element={<SuperAdminLogin />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/profile" element={<Profile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </SuperAdminProvider>
      </AuthProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
