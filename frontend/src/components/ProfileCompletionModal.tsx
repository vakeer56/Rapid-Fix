import { useState, useEffect, type FormEvent } from "react";
import { X, User, Phone, Calendar, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  prefillName?: string | null;
  prefillEmail?: string | null;
}

export const ProfileCompletionModal = ({ isOpen, onClose, prefillName, prefillEmail }: Props) => {
  const { setupToken, onAuthSuccess } = useAuth();

  const [form, setForm] = useState({
    name: prefillName || "",
    age: "",
    gender: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefillName) setForm((f) => ({ ...f, name: prefillName }));
  }, [prefillName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.age || !form.gender || !form.phone) {
      setError("Please fill in all fields to continue.");
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(
        "/auth/firebase/complete-profile",
        {
          name: form.name,
          age: Number(form.age),
          gender: form.gender,
          phone: form.phone,
        },
        { headers: { Authorization: `Bearer ${setupToken}` } }
      );

      const data = res.data;
      if (data.success && data.token) {
        onAuthSuccess(data.token, data.user);
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal card */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-black/30 overflow-hidden border border-white/10">
        {/* Top gradient stripe */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Complete Your Profile
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {prefillEmail
                  ? `Welcome, ${prefillName || "there"}! Just a few more details.`
                  : "Tell us a bit about yourself to get started."}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-4 mt-0.5"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Prefilled info chip */}
          {prefillEmail && (
            <div className="mb-6 flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {(prefillName || prefillEmail)?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  {prefillName}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">{prefillEmail}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="Phone Number (10 digits)"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Age + Gender row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  placeholder="Age"
                  min="16"
                  max="100"
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>
              <div className="relative">
                <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not">Prefer not to say</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <span className="text-lg">⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                "Complete Setup →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
