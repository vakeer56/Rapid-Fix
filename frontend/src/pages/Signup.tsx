import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { ProfileCompletionModal } from "../components/ProfileCompletionModal";
import api from "../service/api";
import logo from "../assets/RapidFix.png";
import { Upload, Loader2 } from "lucide-react";

// ─── Google Icon ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ─── Floating shape decoration ────────────────────────────────────────────────
const Shapes = () => (
  <>
    <div className="absolute -top-32 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
    <div className="absolute bottom-12 right-0 w-60 h-60 rounded-full bg-indigo-700/10 blur-3xl" />
    <div className="absolute top-1/3 -left-10 w-24 h-24 border border-white/5 rounded-2xl rotate-45 opacity-25" />
  </>
);

export default function Signup() {
  const navigate = useNavigate();
  const { isAuthenticated, onAuthSuccess, onNeedsProfile, needsProfile, pendingFirebaseUser } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [selectedRole, setSelectedRole] = useState<"user" | "worker">("user");

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    age: "",
    gender: "",
    experience: "",
    located_address: "",
    preferred_areas: "",
    photo: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handlePincodeChange = async (pin: string) => {
    const cleanPin = pin.replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length === 6) {
      setPincodeLoading(true);
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
        }
      } catch (err) {
        console.error("Signup pincode error:", err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleBackendAuth = async (
    idToken: string,
    extraFields?: { name: string; age: number; gender?: string; phone: string; email?: string; experience?: number; located_address?: string; preferred_areas?: string[]; photo?: string; categories?: string[] }
  ) => {
    const res = await api.post("/auth/firebase", { idToken, role: selectedRole, ...extraFields });
    const data = res.data;
    if (data.success && !data.needsProfile) {
      onAuthSuccess(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } else if (data.success && data.needsProfile) {
      onNeedsProfile(data.setupToken, data.firebaseUser);
    } else {
      throw new Error(data.message || "Sign-up failed");
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const { name, email, password, confirmPassword, phone, age, gender, experience, located_address, preferred_areas, photo } = form;
    if (!name || !email || !password || !phone || !age) {
      setError("Please fill in all basic fields."); return;
    }
    if (!gender) {
      setError("Please select a gender."); return;
    }
    if (selectedRole === "worker") {
      if (!experience || !located_address || !preferred_areas || !photo) {
        setError("For Service Partners, located address, experience, preferred locations, and a profile photo are compulsory.");
        return;
      }
      if (selectedCategories.length === 0) {
        setError("Please select at least one trade category.");
        return;
      }
    }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!/^\d{10}$/.test(phone)) { setError("Enter a valid 10-digit phone number."); return; }

    setLoading(true);
    try {
      localStorage.setItem("rf_is_registering", "true");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const idToken = await cred.user.getIdToken();
      
      const extraFields = selectedRole === "worker" ? {
        name,
        age: Number(age),
        gender,
        experience: Number(experience),
        located_address,
        preferred_areas: preferred_areas.split(",").map(a => a.trim()).filter(Boolean),
        photo,
        phone,
        email,
        categories: selectedCategories,
      } : {
        name,
        age: Number(age),
        gender,
        phone,
        email,
      };

      await handleBackendAuth(idToken, extraFields);
    } catch (err: unknown) {
      const fe = err as { code?: string; message?: string; response?: { data?: { message?: string } } };
      const msg = fe?.response?.data?.message
        || (fe?.code === "auth/email-already-in-use" ? "An account with this email already exists. Sign in instead." :
            fe?.code === "auth/weak-password" ? "Password is too weak." :
            fe?.message || "Sign-up failed. Please try again.");
      setError(msg);
    } finally {
      localStorage.removeItem("rf_is_registering");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      await handleBackendAuth(idToken); // no extra fields — backend will request profile
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code !== "auth/popup-closed-by-user") {
        setError("Google sign-up failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex overflow-hidden bg-transparent font-sans">
        {/* ── Left Branding Panel (Swapped & narrower for elegant, static presentation) ── */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative bg-slate-950/20 backdrop-blur-md flex-col items-center justify-between p-12 overflow-hidden order-1 lg:order-1 animate-slide-left border-r border-slate-900/50">
          <Shapes />

          {/* Logo Centered */}
          <div className="w-full relative z-10 flex justify-center mb-8">
            <Link to="/" className="inline-block transition-transform duration-300 hover:scale-105">
              <img src={logo} alt="RapidFix Logo" className="h-28 object-contain brightness-125" />
            </Link>
          </div>

          {/* Centralized Brand Showcase */}
          <div className="relative z-10 text-center w-full max-w-sm my-auto py-6">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
              Your home.
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent animate-pulse-glow">
                Always at its best.
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto mb-8 font-medium">
              Join thousands of households getting swift, certified, background-verified technician services in under 60 minutes.
            </p>

            {/* Glowing Micro-Cards to Fill Emptiness */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-transform duration-300 hover:scale-[1.03] shadow-lg">
                <div className="text-orange-400 text-lg mb-1">⚡</div>
                <h4 className="text-white text-[10px] font-bold">60-Min Arrival</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Emergency pros nearby</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-transform duration-300 hover:scale-[1.03] shadow-lg">
                <div className="text-amber-400 text-lg mb-1">⭐</div>
                <h4 className="text-white text-[10px] font-bold">4.9/5 Rating</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Highly rated experts</p>
              </div>
            </div>
          </div>

          {/* Bottom Brand Label */}
          <div className="w-full relative z-10 text-center text-[10px] uppercase font-bold tracking-widest text-slate-500">
            RapidFix Inc. · Service Center
          </div>
        </div>

        {/* ── Right Auth Panel (Swapped, wider, py-16 padding & justify-start to ensure top form is never cut off!) ── */}
        <div className="w-full lg:w-1/2 xl:w-[55%] h-screen overflow-y-auto flex flex-col items-center justify-start py-16 px-6 sm:px-12 order-2 lg:order-2 animate-slide-right bg-transparent scrollbar-thin">
          {/* Frosted Glass Form Card Container to Anchor Elements - Upgraded to max-w-xl for maximum breathing space! */}
          <div className="w-full max-w-xl glass-panel rounded-3xl p-8 sm:p-12 shadow-2xl shadow-black/50 my-4">
            {/* Mobile Header Logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <Link to="/" className="transition-transform duration-200 hover:scale-105">
                <img src={logo} alt="RapidFix" className="h-16 object-contain brightness-110" />
              </Link>
            </div>

             <div className="text-center lg:text-left mb-6">
              <h2 className="text-3xl font-extrabold text-white">
                Create Account
              </h2>
              <p className="text-slate-400 text-xs mt-1.5">
                Register to dispatch certified technicians to your doorstep.
              </p>
            </div>

            {/* Sliding Role Switcher Pill */}
            <div className="relative flex p-1.5 bg-slate-950/80 border-2 border-slate-700/80 rounded-2xl mb-5 shadow-inner">
              <div 
                className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 transition-all duration-300 shadow-lg shadow-orange-600/30"
                style={{
                  left: selectedRole === "user" ? "6px" : "50%",
                  right: selectedRole === "user" ? "50%" : "6px",
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedRole("user")}
                className={`relative z-10 w-1/2 py-3.5 text-sm font-black uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                  selectedRole === "user" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Customer Sign Up
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("worker")}
                className={`relative z-10 w-1/2 py-3.5 text-sm font-black uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                  selectedRole === "worker" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Service Partner
              </button>
            </div>

            {/* Role Portal Indicator */}
            {selectedRole === "worker" ? (
              <div className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-4 mb-6 flex items-center gap-3.5 animate-pulse-glow shadow-md shadow-orange-500/[0.02]">
                <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white text-2xl shrink-0 shadow-lg shadow-orange-600/20">🛠️</div>
                <div>
                  <h4 className="text-white text-xs font-black tracking-wider uppercase">SERVICE PARTNER PORTAL ACTIVE</h4>
                  <p className="text-orange-300 text-[10px] sm:text-xs mt-1 leading-normal font-bold">
                    This section is for **Plumbers, Electricians, and Technicians** looking for customer repair jobs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/40 rounded-2xl p-4 mb-6 flex items-center gap-3.5 shadow-md shadow-blue-500/[0.02]">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl shrink-0 shadow-lg shadow-blue-600/20">🏠</div>
                <div>
                  <h4 className="text-white text-xs font-black tracking-wider uppercase">CUSTOMER PORTAL ACTIVE</h4>
                  <p className="text-blue-300 text-[10px] sm:text-xs mt-1 leading-normal font-bold">
                    This section is for **Customers** looking to get their home issues fixed by our experts.
                  </p>
                </div>
              </div>
            )}

            {/* Google button */}
            <button
              onClick={handleGoogleSignup}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] mb-5 cursor-pointer"
            >
              {googleLoading ? (
                <span className="w-4 h-4 border-2 border-slate-350 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Sign up with Google
            </button>

            {/* Form Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative z-10 px-4 bg-[#0a0f1d] text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none">
                Or Fill in Your Details
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Row 1: Full Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Full Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Rajesh Kumar"
                    value={form.name}
                    onChange={set("name")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm animate-fade-in"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set("email")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm animate-fade-in"
                    required
                  />
                </div>
              </div>

              {/* Phone + Age + Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Phone</label>
                  <input
                    id="signup-phone"
                    type="tel"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm animate-fade-in"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Age</label>
                  <input
                    id="signup-age"
                    type="number"
                    placeholder="25"
                    min="18"
                    max="100"
                    value={form.age}
                    onChange={set("age")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm animate-fade-in"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Gender</label>
                  <select
                    id="signup-gender"
                    value={form.gender}
                    onChange={set("gender")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm cursor-pointer animate-fade-in"
                    required
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Worker Specific located_address, preferred_areas, photo */}
              {selectedRole === "worker" && (
                <div className="space-y-4 animate-fade-in border-t border-slate-850 pt-4 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Experience (Yrs)</label>
                      <input
                        id="signup-experience"
                        type="number"
                        placeholder="e.g. 5"
                        min="0"
                        max="50"
                        value={form.experience}
                        onChange={set("experience")}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm animate-fade-in"
                        required={selectedRole === "worker"}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Pincode</label>
                      <div className="relative">
                        <input
                          id="signup-pincode"
                          type="text"
                          maxLength={6}
                          placeholder="606603"
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm"
                          required={selectedRole === "worker"}
                        />
                        {pincodeLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            <Loader2 size={14} className="animate-spin text-orange-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Located Address</label>
                      <input
                        id="signup-address"
                        type="text"
                        placeholder="Auto-filled via pincode"
                        value={form.located_address}
                        onChange={set("located_address")}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm"
                        required={selectedRole === "worker"}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Preferred Locations</label>
                    <input
                      id="signup-preferred"
                      type="text"
                      placeholder="e.g. Velachery, Adyar (Comma separated)"
                      value={form.preferred_areas}
                      onChange={set("preferred_areas")}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-sm"
                      required={selectedRole === "worker"}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-2 ml-0.5">Trade Categories (Select all that apply)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: "Plumber", label: "Plumber 🪠" },
                        { id: "Electrician", label: "Electrician ⚡" },
                        { id: "Mechanic", label: "Mechanic ⚙️" },
                        { id: "Technician", label: "Technician 🖥️" },
                        { id: "Other", label: "Other 🛠️" },
                      ].map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategories((prev) =>
                                prev.includes(cat.id)
                                  ? prev.filter((c) => c !== cat.id)
                                  : [...prev, cat.id]
                              );
                            }}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer select-none ${
                              isSelected
                                ? cat.id === "Plumber" ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10"
                                  : cat.id === "Electrician" ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10"
                                  : cat.id === "Mechanic" ? "bg-purple-500/20 border-purple-500 text-purple-400 shadow-md shadow-purple-500/10"
                                  : cat.id === "Technician" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10"
                                  : "bg-orange-600/20 border-orange-500 text-orange-400 shadow-md shadow-orange-500/10"
                                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border border-dashed border-slate-800 rounded-2xl p-4 bg-slate-950/30 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload size={18} className="text-slate-500 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 w-full text-center sm:text-left">
                      <h4 className="text-xs font-bold text-white mb-1">Profile Photo (Compulsory)</h4>
                      <p className="text-[10px] text-slate-500 mb-3 leading-tight">Must show your face clearly so clients can identify you.</p>
                      <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all border border-slate-700 active:scale-[0.97] select-none">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                          required={selectedRole === "worker"}
                        />
                        Select Photo
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-slate-850/60 pt-4 mt-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Password</label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPass ? "text" : "password"}
                      placeholder="Min. 6 chars"
                      value={form.password}
                      onChange={set("password")}
                      className="w-full px-4 py-2.5 pr-14 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      required
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white select-none cursor-pointer">
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      id="signup-confirm"
                      type={showConfirmPass ? "text" : "password"}
                      placeholder="Repeat"
                      value={form.confirmPassword}
                      onChange={set("confirmPassword")}
                      className="w-full px-4 py-2.5 pr-14 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white select-none cursor-pointer">
                      {showConfirmPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>


              <button
                type="submit"
                disabled={loading || googleLoading}
                id="signup-submit"
                className="w-full py-3.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-500/15 active:scale-[0.98] mt-1 cursor-pointer"
              >
                {loading ? "Creating account…" : "Create Account →"}
              </button>
            </form>

            {/* Symmetrical Outline Redirect Button */}
            <div className="mt-8 pt-6 border-t border-slate-850 text-center animate-fade-in">
              <p className="text-slate-300 text-[10px] uppercase font-bold tracking-wider mb-3">Already registered?</p>
              <Link 
                to="/login" 
                className="inline-flex w-full items-center justify-center py-3 rounded-xl border border-slate-800 text-slate-200 hover:bg-slate-900 font-bold text-xs transition-all text-center no-underline cursor-pointer"
              >
                Sign In Instead
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Modal (for Google sign-up) */}
      <ProfileCompletionModal
        isOpen={needsProfile}
        prefillName={pendingFirebaseUser?.name}
        prefillEmail={pendingFirebaseUser?.email}
        role={selectedRole}
      />
      {error && (
        <>
          <style>{`
            @keyframes slideIn {
              from {
                transform: translateX(120%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            .animate-slide-in {
              animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className="fixed top-6 right-6 z-[99999] max-w-sm w-[90%] sm:w-80 bg-slate-900/90 backdrop-blur-md border border-red-500/30 text-white rounded-2xl p-4 shadow-2xl shadow-red-950/20 animate-slide-in flex items-start gap-3">
            <div className="mt-0.5 p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
              <span>⚠️</span>
            </div>
            <div className="flex-grow">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-red-400">Authentication Error</h4>
              <p className="text-xs text-slate-200 mt-1 font-semibold leading-relaxed">{error}</p>
            </div>
            <button type="button" onClick={() => setError("")} className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0">
              ✕
            </button>
          </div>
        </>
      )}
    </>
  );
}
