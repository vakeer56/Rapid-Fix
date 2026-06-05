import axios from "axios";

const getBaseURL = () => {
  return import.meta.env.VITE_API_BASE_URL || "https://rapid-fix.onrender.com";
};

const api = axios.create({
    baseURL: getBaseURL(),
});

// Attach JWT automatically to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("rf_app_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;