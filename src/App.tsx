import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { VoiceRoomProvider } from "@/contexts/VoiceRoomContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ScrollToTop } from "@/components/ScrollToTop";
import { WindowFocusHandler } from "@/components/WindowFocusHandler";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SuccessPage } from "./pages/Success";
import { AuthCallback } from "./pages/AuthCallback";
import { EmailVerification } from "./pages/EmailVerification";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <VoiceRoomProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAInstallPrompt />
              <WindowFocusHandler />
              <BrowserRouter>
                <ScrollToTop />
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/home" element={<Index />} />
                    <Route path="/chat" element={<Index />} />
                    <Route path="/profile" element={<Index />} />
                    <Route path="/settings" element={<Index />} />
                    <Route path="/success" element={<SuccessPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/email-verification" element={<EmailVerification />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </VoiceRoomProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
