import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AuthProvider, RequireAuth } from "./lib/auth";
import { ToastProvider, EmptyState } from "./components/ui";
import { Layout, AccountLayout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Explore, TourDetail, Destinations } from "./pages/Explore";
import { AuthPage, PasswordPage } from "./pages/Auth";
import { About, Contact } from "./pages/Info";
import { BookingFlow } from "./pages/BookingFlow";
import {
  Dashboard,
  Bookings,
  BookingDetail,
  Wishlist,
  Notifications,
  Profile,
  MyReviews,
} from "./pages/Account";
import { Chat } from "./pages/Chat";
import {
  AdminLayout,
  AdminDashboard,
  AdminUsers,
  AdminTours,
  AdminCatalog,
  AdminAvailability,
  AdminBookings,
  AdminReviews,
  AdminKnowledge,
  AdminNotifications,
  AdminLogs,
} from "./pages/Admin";
import "./styles.css";
import "./polish.css";
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
});
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <ScrollToTop />
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="tours" element={<Explore />} />
                <Route path="tours/:id" element={<TourDetail />} />
                <Route path="destinations" element={<Destinations />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="login" element={<AuthPage mode="login" />} />
                <Route path="register" element={<AuthPage mode="register" />} />
                <Route path="forgot-password" element={<PasswordPage />} />
                <Route path="reset-password" element={<PasswordPage reset />} />
                <Route
                  path="book/:id"
                  element={
                    <RequireAuth>
                      <BookingFlow />
                    </RequireAuth>
                  }
                />
                <Route
                  element={
                    <RequireAuth>
                      <AccountLayout />
                    </RequireAuth>
                  }
                >
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="bookings/:id" element={<BookingDetail />} />
                  <Route path="trips" element={<Bookings trips />} />
                  <Route path="trips/:id" element={<BookingDetail />} />
                  <Route path="wishlist" element={<Wishlist />} />
                  <Route path="reviews" element={<MyReviews />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="assistant" element={<Chat />} />
                </Route>
                <Route
                  path="admin"
                  element={
                    <RequireAuth admin>
                      <AdminLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="tours" element={<AdminTours />} />
                  <Route
                    path="destinations"
                    element={<AdminCatalog kind="destinations" />}
                  />
                  <Route
                    path="categories"
                    element={<AdminCatalog kind="categories" />}
                  />
                  <Route path="availability" element={<AdminAvailability />} />
                  <Route path="bookings" element={<AdminBookings />} />
                  <Route path="reviews" element={<AdminReviews />} />
                  <Route path="rag" element={<AdminKnowledge />} />
                  <Route
                    path="notifications"
                    element={<AdminNotifications />}
                  />
                  <Route path="audit-logs" element={<AdminLogs />} />
                  <Route path="contacts" element={<AdminLogs contacts />} />
                </Route>
                <Route
                  path="*"
                  element={
                    <EmptyState title="A little off the beaten path.">
                      <Link className="btn" to="/">
                        Find your way home
                      </Link>
                    </EmptyState>
                  }
                />
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
