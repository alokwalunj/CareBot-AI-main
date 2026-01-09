import axios from "axios";

/**
 * Vite environment variable
 * Comes from frontend/.env
 */
const BACKEND_URL = import.meta.env.VITE_API_URL;


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
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Handle auth-related errors
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.detail) {
      const detail = error.response.data.detail.toLowerCase();

      if (
        detail.includes("token") ||
        detail.includes("expired") ||
        detail.includes("invalid")
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
 * Chat API
 */
export const chatAPI = {
  sendMessage: (data) => api.post("/chat/message", data),
  getSessions: () => api.get("/chat/sessions"),
  getSessionMessages: (sessionId) =>
    api.get(`/chat/sessions/${sessionId}/messages`),
  deleteSession: (sessionId) =>
    api.delete(`/chat/sessions/${sessionId}`),
};

/**
 * Doctors API
 */
export const doctorsAPI = {
  getAll: () => api.get("/doctors"),
  getById: (id) => api.get(`/doctors/${id}`),
};

/**
 * Appointments API
 */
export const appointmentsAPI = {
  create: (data) => api.post("/appointments", data),
  getAll: () => api.get("/appointments"),
  cancel: (id) => api.patch(`/appointments/${id}/cancel`),
};

/**
 * Voice API
 */
export const voiceAPI = {
  speechToText: (audioBlob) => {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.webm");

    return api.post("/voice/speech-to-text", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  textToSpeech: (text, voice = "nova") =>
    api.post("/voice/text-to-speech", { text, voice }),

  getVoices: () => api.get("/voice/voices"),
};

export default api;
