import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
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
    <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
    <div className="absolute bottom-0 left-0 w-96 h-64 rounded-full bg-indigo-800/10 blur-3xl" />
    <div className="absolute top-1/2 right-12 w-32 h-32 border border-white/5 rounded-3xl rotate-12 opacity-30" />
    <div className="absolute bottom-32 right-1/3 w-16 h-16 border border-white/5 rounded-full opacity-25" />
  </>
);

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, onAuthSuccess, onNeedsProfile, needsProfile, pendingFirebaseUser } = useAuth();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedRole, setSelectedRole] = useState<"user" | "worker">("user");

  // Forgot password states
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotError, setForgotError] = useState("");

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    if (!forgotEmail) {
      setForgotError("Please enter your email address.");
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSuccess("Password reset link sent! Check your email inbox.");
      setForgotEmail("");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setForgotError(err.message || "Failed to send reset link.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBackendAuth = async (idToken: string) => {
    const res = await api.post("/auth/firebase", { idToken, role: selectedRole });
    const data = res.data;
    if (data.success && !data.needsProfile) {
      onAuthSuccess(data.token, data.user);
      navigate(from, { replace: true });
    } else if (data.success && data.needsProfile) {
      onNeedsProfile(data.setupToken, data.firebaseUser);
    } else {
      throw new Error(data.message || "Authentication failed");
    }
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      await handleBackendAuth(idToken);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; response?: { data?: { message?: string } } };
      const msg = firebaseErr?.response?.data?.message
        || (firebaseErr?.code === "auth/user-not-found" ? "No account with this email." :
            firebaseErr?.code === "auth/wrong-password" ? "Incorrect password." :
            firebaseErr?.code === "auth/invalid-credential" ? "Invalid email or password." :
            "Sign-in failed. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      await handleBackendAuth(idToken);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Please try again.");
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
              Fix it fast.
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent animate-pulse-glow">
                Fix it right.
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto mb-8 font-medium">
              Connecting you with certified technicians for plumbing, electrical, CCTV, and appliance repairs instantly.
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
          {/* Frosted Glass Form Card Container to Anchor Elements - Sized beautifully at max-w-md! */}
          <div className="w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/50 my-4">
            {/* Mobile Header Logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <Link to="/" className="transition-transform duration-200 hover:scale-105">
                <img src={logo} alt="RapidFix" className="h-16 object-contain brightness-110" />
              </Link>
            </div>

            <div className="text-center lg:text-left mb-8">
              <h2 className="text-3xl font-extrabold text-white">
                Welcome Back
              </h2>
              <p className="text-slate-400 text-xs mt-1.5">
                Log in to coordinate your home maintenance schedules.
              </p>
            </div>

            {/* Sliding Role Switcher Pill (Upgraded to be extremely prominent & readable) */}
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
                Customer Login
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

            {/* Highly visible active portal explanation badge for aged/non-trendy partners */}
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

            {/* Google button (Corrected Text Color to be highly visible) */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] mb-5 cursor-pointer"
            >
              {googleLoading ? (
                <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            {/* Divider (Corrected Text Color) */}
            <div className="flex items-center gap-4 mb-5">
              <hr className="flex-1 border-slate-800" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">or use email address</span>
              <hr className="flex-1 border-slate-800" />
            </div>

            {/* Email/Password form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 ml-0.5">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm animate-fade-in"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 ml-0.5">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[10px] text-blue-400 hover:underline font-bold cursor-pointer"
                    onClick={() => setForgotOpen(true)}
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm animate-fade-in"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition-colors text-xs select-none cursor-pointer"
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>


              <button
                type="submit"
                disabled={loading || googleLoading}
                id="login-submit"
                className="w-full py-3.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-500/15 active:scale-[0.98] cursor-pointer"
              >
                {loading ? "Signing in…" : "Sign In →"}
              </button>
            </form>

            {/* Symmetrical Outline Redirect Button (Corrected Text Color) */}
            <div className="mt-8 pt-6 border-t border-slate-800 text-center animate-fade-in">
              <p className="text-slate-300 text-[10px] uppercase font-bold tracking-wider mb-3">New to RapidFix?</p>
              <Link 
                to="/signup" 
                className="inline-flex w-full items-center justify-center py-3 rounded-xl border border-slate-800 text-slate-200 hover:bg-slate-900 font-bold text-xs transition-all text-center no-underline cursor-pointer"
              >
                Create a Free Account
              </Link>
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-8">
              Secured connection. By logging in, you agree to our{" "}
              <span className="text-blue-400 cursor-pointer hover:underline font-semibold">Terms</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={needsProfile}
        prefillName={pendingFirebaseUser?.name}
        prefillEmail={pendingFirebaseUser?.email}
        role={selectedRole}
      />

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-[999] backdrop-blur-sm bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-scale-up">
            
            <button
              type="button"
              onClick={() => {
                setForgotOpen(false);
                setForgotError("");
                setForgotSuccess("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800"
            >
              &times;
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">Reset Password</h3>
              <p className="text-xs text-slate-300 mt-2">
                Enter your registered email address and we'll send you a secure link to reset your password.
              </p>
            </div>

            {forgotError && (
              <div className="mb-4 text-xs text-red-400 bg-red-950/20 border border-red-900 rounded-xl px-4 py-2.5 font-bold">
                ⚠ {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900 rounded-xl px-4 py-2.5 font-bold">
                ✓ {forgotSuccess}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 ml-0.5">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm animate-fade-in"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 transition-all cursor-pointer shadow-lg shadow-orange-500/10 active:scale-[0.98]"
              >
                {forgotLoading ? "Sending Link…" : "Send Reset Link"}
              </button>
            </form>
          </div>
        </div>
      )}
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
};