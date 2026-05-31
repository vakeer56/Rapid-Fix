import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
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