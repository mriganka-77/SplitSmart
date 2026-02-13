import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OfflineProvider } from "./contexts/OfflineContext";
import { RequireAuth } from "./components/auth/RequireAuth";

import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import AddExpense from "./pages/AddExpense";
import Balances from "./pages/Balances";
import Profile from "./pages/Profile";
import Contacts from "./pages/Contacts";
import PaymentHistory from "./pages/PaymentHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <OfflineProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/groups"
                  element={
                    <RequireAuth>
                      <Groups />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/group/:id"
                  element={
                    <RequireAuth>
                      <GroupDetails />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/add-expense"
                  element={
                    <RequireAuth>
                      <AddExpense />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/balances"
                  element={
                    <RequireAuth>
                      <Balances />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/contacts"
                  element={
                    <RequireAuth>
                      <Contacts />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <RequireAuth>
                      <PaymentHistory />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RequireAuth>
                      <Profile />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
