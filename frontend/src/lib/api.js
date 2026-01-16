import axios from "axios";

/**
 * Backend base URL
 * Vercel Env Var: VITE_API_URL=https://carebot-ai-main-1.onrender.com
 */
const BACKEND_URL =
  (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") ||
  "https://carebot-ai-main-1.onrender.com";

/**
 * API base URL
 */
const API_BASE = `${BACKEND_URL}/api`;

/**
 * Create axios instance
 */
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
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
 * Handle auth errors (Node backend returns { message })
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const msg = (error?.response?.data?.message || "").toLowerCase();

    if (
      status === 401 &&
      (msg.includes("token") || msg.includes("expired") || msg.includes("invalid"))
    ) {
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
 * Auth API
 */
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  // keep if your UI calls it; otherwise remove later
  getMe: () => api.get("/auth/me"),
};

/**
 * Chat API (match your backend routes)
 * server.js mounts: /api/chat
 */

export const chatAPI = {
  // ✅ correct endpoint
  sendMessage: (data) => api.post("/chat/messages", data),

  // ✅ keep for older code that still calls saveMessage
  saveMessage: (data) => api.post("/chat/messages", data),

  // ✅ list messages
  getMessages: () => api.get("/chat/messages"),
};



/**
 * Doctors API (keep exports so build doesn't break)
 * If backend not implemented yet, these will 404 when called — that's OK for build.
 */
export const doctorsAPI = {
  getAll: () => api.get("/doctors"),
  getById: (id) => api.get(`/doctors/${id}`),
};

/**
 * Appointments API (needed by Dashboard import)
 * If backend not implemented yet, it may 404 when called — OK for now.
 */
export const appointmentsAPI = {
  create: (data) => api.post("/appointments", data),
  getAll: () => api.get("/appointments"),
  cancel: (id) => api.patch(`/appointments/${id}/cancel`),
};

/**
 * Voice API (keep exports so build doesn't break)
 */
export const voiceAPI = {
  speechToText: (audioBlob) => {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.webm");

    return api.post("/voice/speech-to-text", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  textToSpeech: (text, voice = "nova") => api.post("/voice/text-to-speech", { text, voice }),

  getVoices: () => api.get("/voice/voices"),
};

export default api;
