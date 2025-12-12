import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { cleanupSensitiveLocalStorage } from "@/lib/localStorageMigration";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewAssessment from "./pages/NewAssessment";
import ContinueAssessment from "./pages/ContinueAssessment";
import QuickProtocol from "./pages/QuickProtocol";
import ViewAssessment from "./pages/ViewAssessment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Executa migração de limpeza de dados sensíveis do localStorage
cleanupSensitiveLocalStorage();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assessment/new" element={<NewAssessment />} />
              <Route path="/assessment/continue" element={<ContinueAssessment />} />
              <Route path="/assessment/view" element={<ViewAssessment />} />
              <Route path="/quick-protocol" element={<QuickProtocol />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
