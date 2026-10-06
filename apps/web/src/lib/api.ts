import axios from "axios";
export const api = axios.create({ baseURL: "/api", withCredentials: true });
let refreshing: Promise<unknown> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      (!original.url?.startsWith("/auth/") || original.url === "/auth/me")
    ) {
      original._retry = true;
      try {
        refreshing ??= api.post("/auth/refresh").finally(() => {
          refreshing = null;
        });
        await refreshing;
        return api(original);
      } catch {
        window.dispatchEvent(new Event("auth-expired"));
      }
    }
    throw error;
  },
);
export const get = <T>(url: string) => api.get<T>(url).then((r) => r.data);
export function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.message || "Unable to connect. Please try again."
    : error instanceof Error
      ? error.message
      : "Something went wrong.";
}
export const money = (cents: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export const date = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
