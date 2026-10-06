import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { api, get } from "./api";
import type { User } from "../types";
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  refresh: () => Promise<unknown>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => get<User>("/auth/me"),
    retry: false,
    staleTime: 60000,
  });
  useEffect(() => {
    const clear = () => {
      client.setQueryData(["me"], null);
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    };
    window.addEventListener("auth-expired", clear);
    return () => window.removeEventListener("auth-expired", clear);
  }, [client]);
  return (
    <AuthContext.Provider
      value={{
        user: query.data || null,
        loading: query.isLoading,
        refresh: () => query.refetch(),
        logout: async () => {
          try {
            await api.post("/auth/logout");
          } catch {
            // Keep signout resilient even if network or server session is already dead
          } finally {
            client.setQueryData(["me"], null);
            client.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export function RequireAuth({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return <div className="page container">Loading your account…</div>;
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user.role !== "ADMIN")
    return <Navigate to="/dashboard" replace />;
  return children;
}
