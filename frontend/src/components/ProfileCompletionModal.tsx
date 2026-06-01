import { useState, useEffect, type FormEvent } from "react";
import { X, User, Phone, Calendar, Users, Briefcase, MapPin, Upload, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  prefillName?: string | null;
  prefillEmail?: string | null;
  role?: "user" | "worker";
}

export const ProfileCompletionModal = ({ isOpen, onClose, prefillName, prefillEmail, role = "user" }: Props) => {
  const { setupToken, onAuthSuccess, signOut } = useAuth();

  const [form, setForm] = useState({
    name: prefillName || "",
    age: "",
    gender: "",
    phone: "",
    experience: "",
    pincode: "",
    located_address: "",
    preferred_areas: "",
    photo: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefillName) setForm((f) => ({ ...f, name: prefillName }));
  }, [prefillName]);

  const handlePincodeChange = async (pin: string) => {
    const cleanPin = pin.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      setError("");
      try {
        const res = await api.get(`/address/pincode/${cleanPin}`);
        const data = res.data;
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
          const office = data[0].PostOffice[0];
          let matchedState = office.State;
          if (matchedState.toLowerCase() === "tamilnadu") matchedState = "Tamil Nadu";
          
          const city = office.Block && office.Block !== "NA" ? office.Block : office.District;
          const autodetectedAddress = `${city}, ${office.District}, ${matchedState} - ${cleanPin}`;
          
          setForm(prev => ({
            ...prev,
            located_address: autodetectedAddress
          }));
        } else {
          setError("Invalid pincode or details not found.");
        }
      } catch (err) {
        console.error("Completion modal pincode error:", err);
        setError("Error fetching pincode details. Please enter address manually.");
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Profile photo must be less than 5MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setForm(prev => ({ ...prev, photo: base64String }));
        setPhotoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (role === "worker") {
      if (!form.name || !form.age || !form.phone || !form.experience || !form.located_address || !form.preferred_areas || !form.photo) {
        setError("Please fill in all fields and select a compulsory profile photo.");
        return;
      }
    } else {
      if (!form.name || !form.age || !form.gender || !form.phone) {
        setError("Please fill in all fields to continue.");
        return;
      }
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    try {
      const payload = role === "worker" ? {
        name: form.name,
        age: Number(form.age),
        experience: Number(form.experience),
        located_address: form.located_address,
        preferred_areas: form.preferred_areas,
        photo: form.photo,
        phone: form.phone,
      } : {
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone,
      };

      const res = await api.post(
        "/auth/firebase/complete-profile",
        payload,
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
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      {/* Modal card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden border border-white/10 max-h-[90vh] flex flex-col">
        {/* Top gradient stripe */}
        <div className={`h-2.5 w-full bg-gradient-to-r ${role === "worker" ? "from-orange-500 via-amber-500 to-yellow-500" : "from-blue-500 via-indigo-500 to-violet-500"}`} />

        <div className="p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {role === "worker" ? "Service Partner Onboarding" : "Complete Your Profile"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {role === "worker" 
                  ? "Provide professional details to activate your partner status."
                  : prefillEmail
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
            <div className={`mb-6 flex items-center gap-3 border rounded-2xl px-4 py-3 ${
              role === "worker" 
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br ${
                role === "worker" ? "from-orange-500 to-amber-500" : "from-blue-500 to-indigo-500"
              }`}>
                {(prefillName || prefillEmail)?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  {prefillName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{prefillEmail}</p>
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
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm"
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
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Age + Gender/Experience Row */}
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm"
                />
              </div>

              {role === "worker" ? (
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    placeholder="Experience (Years)"
                    min="0"
                    max="50"
                    value={form.experience}
                    onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm"
                  />
                </div>
              ) : (
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
              )}
            </div>

            {/* Worker Specific Fields */}
            {role === "worker" && (
              <>
                {/* Pincode with Auto-fill indicator */}
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pincode (e.g. 600001)"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm"
                  />
                  {pincodeLoading && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                      <Loader2 size={16} className="animate-spin text-orange-500" />
                    </div>
                  )}
                </div>

                {/* Located Address */}
                <div className="relative">
                  <textarea
                    placeholder="Located Address (Auto-filled via Pincode)"
                    value={form.located_address}
                    onChange={(e) => setForm((f) => ({ ...f, located_address: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm resize-none"
                  />
                </div>

                {/* Preferred Areas */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Preferred Locations (Comma-separated, e.g. Velachery, Adyar)"
                    value={form.preferred_areas}
                    onChange={(e) => setForm((f) => ({ ...f, preferred_areas: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm"
                  />
                </div>

                {/* Photo Upload with Preview */}
                <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={18} className="text-slate-400 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 w-full text-center sm:text-left">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">Profile Photo (Compulsory)</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mb-2.5 leading-tight">Must show your face clearly so clients can identify you.</p>
                    <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-all border border-slate-200 dark:border-slate-700 active:scale-[0.97] select-none">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      Select Photo
                    </label>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <span className="text-lg">⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 shadow-lg active:scale-[0.98] ${
                role === "worker" 
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-orange-500/25 hover:shadow-orange-500/40" 
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 hover:shadow-blue-500/40"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
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

            <button
              type="button"
              onClick={signOut}
              className="w-full py-3 rounded-xl font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs transition-all border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-[0.98]"
            >
              Cancel & Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
