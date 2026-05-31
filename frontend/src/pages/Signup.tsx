import { useState, type FormEvent } from "react";
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
  const { onAuthSuccess, onNeedsProfile, needsProfile, pendingFirebaseUser } = useAuth();

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    age: "",
    gender: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleBackendAuth = async (
    idToken: string,
    extraFields?: { name: string; age: number; gender: string; phone: string; email?: string }
  ) => {
    const res = await api.post("/auth/firebase", { idToken, ...extraFields });
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

    const { name, email, password, confirmPassword, phone, age, gender } = form;
    if (!name || !email || !password || !phone || !age || !gender) {
      setError("Please fill in all fields."); return;
    }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!/^\d{10}$/.test(phone)) { setError("Enter a valid 10-digit phone number."); return; }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const idToken = await cred.user.getIdToken();
      await handleBackendAuth(idToken, {
        name,
        age: Number(age),
        gender,
        phone,
        email,
      });
    } catch (err: unknown) {
      const fe = err as { code?: string; message?: string; response?: { data?: { message?: string } } };
      const msg = fe?.response?.data?.message
        || (fe?.code === "auth/email-already-in-use" ? "An account with this email already exists. Sign in instead." :
            fe?.code === "auth/weak-password" ? "Password is too weak." :
            fe?.message || "Sign-up failed. Please try again.");
      setError(msg);
    } finally {
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
      <div className="min-h-screen flex overflow-hidden bg-slate-950 font-sans">
        {/* ── Left Auth Panel ── */}
        <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 sm:p-12 order-2 lg:order-1 animate-slide-left bg-slate-950">
          {/* Frosted Glass Form Card Container to Anchor Elements */}
          <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/50">
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

            {/* Google button (Corrected Text Color to be highly visible) */}
            <button
              onClick={handleGoogleSignup}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-slate-805 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] mb-5 cursor-pointer"
            >
              {googleLoading ? (
                <span className="w-4 h-4 border-2 border-slate-350 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Sign up with Google
            </button>

            {/* Divider (Corrected Text Color) */}
            <div className="flex items-center gap-4 mb-5">
              <hr className="flex-1 border-slate-800" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">or fill in your details</span>
              <hr className="flex-1 border-slate-800" />
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-3.5">
              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Full Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Rajesh Kumar"
                    value={form.name}
                    onChange={set("name")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm animate-fade-in"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm animate-fade-in"
                    required
                  />
                </div>
              </div>

              {/* Phone + Age + Gender */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Phone</label>
                  <input
                    id="signup-phone"
                    type="tel"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm animate-fade-in"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Age</label>
                  <input
                    id="signup-age"
                    type="number"
                    placeholder="25"
                    min="16"
                    max="100"
                    value={form.age}
                    onChange={set("age")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm animate-fade-in"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Gender</label>
                  <select
                    id="signup-gender"
                    value={form.gender}
                    onChange={set("gender")}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not">Prefer not</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Password</label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPass ? "text" : "password"}
                      placeholder="Min. 6 chars"
                      value={form.password}
                      onChange={set("password")}
                      className="w-full px-4 py-2.5 pr-14 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm animate-fade-in"
                      required
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300 hover:text-white select-none cursor-pointer">
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">Confirm Password</label>
                  <input
                    id="signup-confirm-password"
                    type={showPass ? "text" : "password"}
                    placeholder="Repeat"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm animate-fade-in"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs bg-red-950/20 border border-red-900 rounded-xl px-4 py-3 animate-fade-in">
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                id="signup-submit"
                className="w-full py-3 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-500/15 active:scale-[0.98] mt-1 cursor-pointer"
              >
                {loading ? "Creating account…" : "Create Account →"}
              </button>
            </form>

            {/* Symmetrical Outline Redirect Button (Corrected Text Color) */}
            <div className="mt-8 pt-6 border-t border-slate-805 text-center animate-fade-in">
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

        {/* ── Right Branding Panel ── */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex-col items-center justify-between p-12 overflow-hidden order-1 lg:order-2 animate-slide-right border-l border-slate-900/50">
          <Shapes />

          {/* Logo Centered and Larger */}
          <div className="w-full relative z-10 flex justify-center mb-8">
            <Link to="/" className="inline-block transition-transform duration-300 hover:scale-105">
              <img src={logo} alt="RapidFix Logo" className="h-32 object-contain brightness-125" />
            </Link>
          </div>

          {/* Centralized Brand Showcase */}
          <div className="relative z-10 text-center w-full max-w-lg my-auto py-6">
            <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
              Your home.
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent animate-pulse-glow">
                Always at its best.
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto mb-8">
              Join thousands of households getting swift, certified, background-verified technician services in under 60 minutes.
            </p>

            {/* Glowing Micro-Cards to Fill Emptiness */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-transform duration-300 hover:scale-[1.03] shadow-lg">
                <div className="text-orange-400 text-xl mb-1.5">⚡</div>
                <h4 className="text-white text-xs font-bold">60-Min Arrival</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Emergency technicians nearby</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-transform duration-300 hover:scale-[1.03] shadow-lg">
                <div className="text-amber-400 text-xl mb-1.5">⭐</div>
                <h4 className="text-white text-xs font-bold">4.9/5 Average Rating</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Highly rated local experts</p>
              </div>
            </div>
          </div>

          {/* Bottom Brand Label */}
          <div className="w-full relative z-10 text-center text-[10px] uppercase font-bold tracking-widest text-slate-500">
            RapidFix Inc. · Service Center
          </div>
        </div>
      </div>

      {/* Profile Completion Modal (for Google sign-up) */}
      <ProfileCompletionModal
        isOpen={needsProfile}
        prefillName={pendingFirebaseUser?.name}
        prefillEmail={pendingFirebaseUser?.email}
      />
    </>
  );
}
