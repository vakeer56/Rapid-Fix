import { useState, type FormEvent } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";
import { auth } from "../config/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Users, 
  Key, 
  Save, 
  ShieldAlert, 
  CheckCircle
} from "lucide-react";

export default function Profile() {
  const { appUser, appToken, onAuthSuccess } = useAuth();

  const [form, setForm] = useState({
    name: appUser?.name || "",
    email: appUser?.email || "",
    phone: appUser?.phone || "",
    age: appUser?.age ? String(appUser.age) : "",
    gender: appUser?.gender || "",
  });

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const setField = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!form.name || !form.phone || !form.age || !form.gender || !form.email) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError("Please enter a valid 10-digit phone number.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.put("/auth/profile", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        age: Number(form.age),
        gender: form.gender,
      });

      const data = res.data;
      if (data.success && data.user) {
        setSuccess("Profile updated successfully!");
        if (appToken) {
          onAuthSuccess(appToken, data.user);
        }
      } else {
        setError(data.message || "Failed to update profile.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Server error while saving.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    setResetSuccess(false);
    setResetLoading(true);

    if (!form.email) {
      setError("Email address is required to reset password.");
      setResetLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, form.email);
      setResetSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err?.code === "auth/user-not-found") {
        setError("No account found for this email in Firebase.");
      } else {
        setError("Failed to send reset email: " + (err.message || err));
      }
    } finally {
      setResetLoading(false);
    }
  };

  const getProviderBadge = () => {
    if (appUser?.firebaseUid) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
          Google / Firebase
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800">
        SMS OTP (Twilio)
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main className="flex-grow pt-28 pb-16 px-6 md:px-16 max-w-4xl mx-auto w-full">
        {/* Header copy */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your personal profile details, authentication options, and security settings.
          </p>
        </div>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left panel: Info summary */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-center shadow-sm">
              <div className="relative w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/25">
                {form.name?.[0]?.toUpperCase() || "U"}
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{form.name || "User"}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{form.email}</p>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-left space-y-3.5">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Auth Method</p>
                  <div className="mt-1">{getProviderBadge()}</div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Account ID</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all mt-1">
                    {appUser?._id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* Success / Error Banners */}
            {error && (
              <div className="flex items-center gap-3 text-red-500 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl px-4 py-3">
                <ShieldAlert size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 text-emerald-500 text-sm bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl px-4 py-3">
                <CheckCircle size={18} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Profile editing card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <User size={18} className="text-blue-500" />
                Personal Details
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Full Name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={setField("name")}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={setField("email")}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Phone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Age</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={form.age}
                        onChange={setField("age")}
                        min="16"
                        max="100"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Gender</label>
                    <div className="relative">
                      <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={form.gender}
                        onChange={setField("gender")}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm appearance-none cursor-pointer"
                        required
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not">Prefer not</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-900 dark:bg-orange-600 hover:bg-blue-800 dark:hover:bg-orange-500 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Save size={16} />
                    {loading ? "Saving Changes…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Password security card (only useful if using Firebase Auth) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Key size={18} className="text-orange-500" />
                Security & Passwords
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Request a password reset email to change your login credentials via secure Firebase links.
              </p>

              {resetSuccess ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Reset Email Dispatched!</h4>
                    <p className="text-xs mt-1 leading-relaxed">
                      We have sent a password reset link to <strong className="font-semibold">{form.email}</strong>. 
                      Please verify your inbox and spam filters to reset.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Key size={14} />
                  {resetLoading ? "Dispatching link…" : "Send Password Reset Email"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
