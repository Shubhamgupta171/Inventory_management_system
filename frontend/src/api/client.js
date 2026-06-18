import axios from "axios";

// The backend base URL is injected at build time via Vite env vars.
// Falls back to localhost for local `npm run dev`.
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

/**
 * Normalises backend / network errors into a single readable message string.
 * FastAPI returns either {detail: "..."} or {detail: [{loc, msg}, ...]}.
 */
export function extractError(error) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join(", ");
  }
  if (typeof detail === "string") return detail;
  if (error?.message) return error.message;
  return "Something went wrong. Please try again.";
}

export default api;
