import axios from "axios";

/**
 * Backend base URL
 * Put this in frontend/.env:
 * VITE_API_URL=https://carebot-ai-main-1.onrender.com
 */
const BACKEND_URL =
  (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") ||
  "https://carebot-ai-main-1.onrender.com";

/**
 * API base URL
 */
const API_BASE = `${BACKEND_URL}/api`;

/**
 * Axios instance
 */
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

/**
 * Attach auth token to every request
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Handle auth-related errors (Node backend returns { message })
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const msg = (error?.response?.data?.message || "").toLowerCase();

    if (status === 401 && (msg.includes("token") || msg.includes("expired") || msg.includes("invalid"))) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/register")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Auth API (matches your Node backend)
 * POST /api/auth/register -> returns { token, user }
 * POST /api/auth/login    -> returns { token, user }
 */
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
};

/**
 * Chat API (matches your Node backend)
 * POST /api/chat/messages
 * GET  /api/chat/messages
 */
export const chatAPI = {
  saveMessage: (data) => api.post("/chat/messages", data),
  getMessages: () => api.get("/chat/messages"),
};

export default api;
