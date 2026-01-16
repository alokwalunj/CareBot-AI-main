import axios from "axios";

/**
 * Backend base URL
 * Vercel Env Var example: VITE_API_URL=https://carebot-ai-main-1.onrender.com
 */
const BACKEND_URL =
  (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") ||
  "https://carebot-ai-main-1.onrender.com";

/**
 * API base URL
 */
const API_BASE = `${BACKEND_URL}/api`;

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
  getMe: () => api.get("/auth/me"),
};

/**
 * Chat API (MATCHES YOUR BACKEND)
 * server.js mounts: /api/chat
 * chatRoutes.js defines: POST /messages, GET /messages
 */
export const chatAPI = {
  sendMessage: (data) => api.post("/chat/messages", data),

  getSessions: () => api.get("/chat/sessions"),
  createSession: (data) => api.post("/chat/sessions", data),
  deleteSession: (id) => api.delete(`/chat/sessions/${id}`),

  getSessionMessages: (sessionId) => api.get(`/chat/sessions/${sessionId}/messages`),
};


/**
 * Keep these exports so your build doesn't break.
 * If backend isn't implemented, they will 404 ONLY when those pages call them.
 */
export const doctorsAPI = {
  getAll: () => api.get("/doctors"),
  getById: (id) => api.get(`/doctors/${id}`),
};

export const appointmentsAPI = {
  create: (data) => api.post("/appointments", data),
  getAll: () => api.get("/appointments"),
  cancel: (id) => api.patch(`/appointments/${id}/cancel`),
};

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
