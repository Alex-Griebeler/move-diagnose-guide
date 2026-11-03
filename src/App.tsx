import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { PasswordSetupGate } from "@/components/auth/PasswordSetupGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cleanupSensitiveLocalStorage } from "@/lib/localStorageMigration";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewAssessment from "./pages/NewAssessment";
import ContinueAssessment from "./pages/ContinueAssessment";
import QuickProtocol from "./pages/QuickProtocol";
import OAuthConsent from "./pages/OAuthConsent";
import SetPassword from "./pages/SetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Executa migração de limpeza de dados sensíveis do localStorage
cleanupSensitiveLocalStorage();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    {/* Inside ThemeProvider so the fallback keeps the theme; last resort for render errors */}
    <ErrorBoundary scope="app" variant="page">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PasswordSetupGate>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/assessment/new" element={<NewAssessment />} />
                  <Route path="/assessment/continue" element={<ContinueAssessment />} />
                  <Route path="/quick-protocol" element={<QuickProtocol />} />
                  <Route path="/definir-senha" element={<SetPassword />} />
                  <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PasswordSetupGate>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
