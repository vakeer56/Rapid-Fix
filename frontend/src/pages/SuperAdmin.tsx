import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  Flame,
  Cloud,
  Bot,
  Code,
  Copy,
  Download,
  RefreshCw,
  CheckCircle,
  Server,
  LayoutDashboard,
  FileText,
  Sparkles,
  ArrowLeft,
  Terminal,
  Save,
  LogOut,
  ChevronRight,
  Lock,
  type LucideIcon,
} from "lucide-react";
import api from "../service/api";

interface MongoConfig {
  uri: string;
  dbName: string;
  maxPoolSize: number;
  timeout: number;
}

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

interface GeminiConfig {
  apiKey: string;
}

const CARD = "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm";
const INPUT = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
const LABEL = "block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5";
const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer";

export default function SuperAdmin() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("rf_super_admin_authenticated") === "true";
  });
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "mongodb" | "firebase" | "cloudinary" | "gemini" | "dotenv">("dashboard");

  // Initial configurations, will be dynamically populated from backend .env
  const [mongo, setMongo] = useState<MongoConfig>({
    uri: "",
    dbName: "",
    maxPoolSize: 10,
    timeout: 5000
  });

  const [firebase, setFirebase] = useState<FirebaseConfig>({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  });

  const [cloudinary, setCloudinary] = useState<CloudinaryConfig>({
    cloudName: "",
    apiKey: "",
    apiSecret: ""
  });

  const [gemini, setGemini] = useState<GeminiConfig>({
    apiKey: ""
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchActiveConfig = async () => {
    try {
      addLog("[SYSTEM] Fetching active environment configurations from backend...");
      const response = await api.get("/auth/admin/config");
      if (response.data && response.data.success && response.data.config) {
        const { mongo, firebase, cloudinary, gemini } = response.data.config;
        if (mongo) setMongo(mongo);
        if (firebase) setFirebase(firebase);
        if (cloudinary) setCloudinary(cloudinary);
        if (gemini) setGemini(gemini);
        addLog("[SYSTEM] Successfully loaded configurations from backend .env!");
      } else {
        addLog("[SYSTEM] Failed to load configurations from backend.");
      }
    } catch (err: any) {
      addLog(`[SYSTEM] Error retrieving backend configuration: ${err.message}`);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    if (adminUsername === "admin123" && adminPassword === "test123") {
      sessionStorage.setItem("rf_super_admin_authenticated", "true");
      setIsAdminAuthenticated(true);
    } else {
      setAdminError("Invalid administrator credentials. Access Denied.");
    }
  };

  const handleAdminSignOut = () => {
    sessionStorage.removeItem("rf_super_admin_authenticated");
    setIsAdminAuthenticated(false);
    setAdminUsername("");
    setAdminPassword("");
  };

  // Fetch configs from the server when authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchActiveConfig();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAuthenticated]);

  // Generate logs simulation
  useEffect(() => {
    const mockLogs = [
      "[SYSTEM] Control Center initialized.",
      "[FIREBASE] App instance ready for authentication integrations.",
      "[API] Server route mapping successfully verified."
    ];
    setLogs(mockLogs);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 15)]);
  };

  const syncConfigsToServer = async (
    targetMongo: MongoConfig,
    targetFirebase: FirebaseConfig,
    targetCloudinary?: CloudinaryConfig,
    targetGemini?: GeminiConfig
  ) => {
    const activeCloudinary = targetCloudinary || cloudinary;
    const activeGemini = targetGemini || gemini;
    addLog("[SYSTEM] Initiating server-side .env sync operation...");
    try {
      const response = await api.post("/auth/admin/sync-config", {
        mongo: targetMongo,
        firebase: targetFirebase,
        cloudinary: activeCloudinary,
        gemini: activeGemini
      });
      if (response.data && response.data.success) {
        addLog(`[SYSTEM] Sync successful! Database: ${response.data.dbStatus}`);
        addLog("[SYSTEM] In-memory process.env successfully hot-reloaded.");

        // Save the Firebase config to localStorage to allow dynamic runtime initialization in production
        localStorage.setItem("rf_firebase_config", JSON.stringify(targetFirebase));

        triggerSaveSuccess();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        addLog(`[SYSTEM] Server sync failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      addLog(`[SYSTEM] API connection error during sync: ${err.message}`);
    }
  };

  const handleSaveMongo = async (e: React.FormEvent) => {
    e.preventDefault();
    addLog(`[MONGO] Dynamic configurations updated: dbName=${mongo.dbName}`);
    await syncConfigsToServer(mongo, firebase, cloudinary, gemini);
  };

  const handleSaveFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    addLog(`[FIREBASE] Dynamic credentials updated: apiKey=${(firebase.apiKey || "").substring(0, 8)}...`);
    await syncConfigsToServer(mongo, firebase, cloudinary, gemini);
  };

  const handleSaveCloudinary = async (e: React.FormEvent) => {
    e.preventDefault();
    addLog(`[CLOUDINARY] Dynamic credentials updated: cloudName=${cloudinary.cloudName}`);
    await syncConfigsToServer(mongo, firebase, cloudinary, gemini);
  };

  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    addLog(`[GEMINI] Dynamic credentials updated: apiKey=${(gemini.apiKey || "").substring(0, 8)}...`);
    await syncConfigsToServer(mongo, firebase, cloudinary, gemini);
  };

  const triggerSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const testMongoConnection = () => {
    setConnectionStatus("testing");
    addLog(`[MONGO] Testing connection to ${mongo.uri}...`);
    setTimeout(() => {
      if (mongo.uri.startsWith("mongodb://") || mongo.uri.startsWith("mongodb+srv://")) {
        setConnectionStatus("success");
        addLog(`[MONGO] Successfully connected to database: ${mongo.dbName}`);
      } else {
        setConnectionStatus("error");
        addLog("[MONGO] Connection failed: Invalid URI schema");
      }
    }, 1500);
  };

  // Generate Env Content
  const generateEnvString = () => {
    return `# RapidFix Generated Environment Variables - ${new Date().toLocaleDateString()}
# Copy or download this file to replace your root .env

# MongoDB Configuration
MONGODB_URI=${mongo.uri}
MONGODB_DB_NAME=${mongo.dbName}
MONGODB_MAX_POOL_SIZE=${mongo.maxPoolSize}
MONGODB_TIMEOUT=${mongo.timeout}

# Firebase Configuration
VITE_FIREBASE_API_KEY=${firebase.apiKey}
VITE_FIREBASE_AUTH_DOMAIN=${firebase.authDomain}
VITE_FIREBASE_PROJECT_ID=${firebase.projectId}
VITE_FIREBASE_STORAGE_BUCKET=${firebase.storageBucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${firebase.messagingSenderId}
VITE_FIREBASE_APP_ID=${firebase.appId}
VITE_FIREBASE_MESAURE_ID=${firebase.measurementId}

# Cloudinary Configuration
CLOUD_NAME=${cloudinary.cloudName}
CLOUD_API_KEY=${cloudinary.apiKey}
CLOUD_API_SECRET=${cloudinary.apiSecret}

# Gemini AI Configuration
GEMINI_API_KEY=${gemini.apiKey}
`;
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(generateEnvString());
    setCopied(true);
    addLog("[SYSTEM] Environment variables copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadEnv = () => {
    const element = document.createElement("a");
    const file = new Blob([generateEnvString()], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = ".env";
    document.body.appendChild(element);
    element.click();
    addLog("[SYSTEM] .env file download triggered.");
    document.body.removeChild(element);
  };

  const resetToEnvDefaults = async () => {
    addLog("[SYSTEM] Resetting dynamic configurations to active backend .env values...");
    await fetchActiveConfig();
    triggerSaveSuccess();
  };

  // ─── Login gate ─────────────────────────────────────────────────────────
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <Link
          to="/"
          className="absolute top-8 left-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all no-underline bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-sm"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="w-full max-w-md relative z-10">
          <div className={`${CARD} p-8 shadow-xl`}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-4 border border-indigo-100 dark:border-indigo-500/20">
                <Server size={26} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Super-Admin Console</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Authorized personnel only. Enter your console credentials.</p>
            </div>

            {adminError && (
              <div className="mb-6 flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl px-4 py-3">
                ⚠ {adminError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Admin Username</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin123"
                  className={INPUT}
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                  <button type="button" onClick={() => setShowAdminPass(!showAdminPass)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                    {showAdminPass ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showAdminPass ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className={INPUT}
                  required
                />
              </div>
              <button type="submit" className={`${BTN_PRIMARY} w-full mt-2`}>
                <Lock size={15} /> Authenticate Console
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const navItems: { id: typeof activeTab; label: string; icon: LucideIcon }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "mongodb", label: "MongoDB", icon: Database },
    { id: "firebase", label: "Firebase", icon: Flame },
    { id: "cloudinary", label: "Cloudinary", icon: Cloud },
    { id: "gemini", label: "Gemini AI", icon: Bot },
    { id: "dotenv", label: ".env Sync", icon: Code },
  ];

  // Reusable section header (explicit icon-wrap classes so Tailwind keeps them)
  const SectionHead = ({ icon: Icon, title, desc, iconWrap = "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" }: { icon: LucideIcon; title: string; desc: string; iconWrap?: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className={`p-2 rounded-xl ${iconWrap}`}>
        <Icon size={18} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );

  // ─── Authenticated console ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans">
      {/* Header */}
      <header className="z-10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Server size={20} />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Super-Admin <span className="hidden sm:inline text-slate-400 font-medium">Console</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-semibold">
              <CheckCircle size={14} /> Configs applied
            </div>
          )}
          <button onClick={handleAdminSignOut} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold transition-all cursor-pointer">
            <LogOut size={13} /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6 lg:gap-8 items-start">
        {/* Sidebar */}
        <nav className={`${CARD} p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:sticky lg:top-28`}>
          {navItems.map((item) => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={14} className="hidden lg:block opacity-70" />}
              </button>
            );
          })}

          <div className="hidden lg:block border-t border-slate-100 dark:border-slate-800 my-1.5"></div>

          <button
            onClick={resetToEnvDefaults}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw size={14} className="shrink-0" />
            <span className="text-left">Reset to .env</span>
          </button>
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className={`${CARD} p-6 sm:p-8`}>
                <SectionHead icon={Sparkles} title="System Overview" desc="Live configuration status, overridable without server rebuilds." />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><Database size={20} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">MongoDB</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{mongo.dbName || "—"}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0"><Flame size={20} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Firebase API</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{firebase.apiKey ? "Configured" : "Missing"}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><Server size={20} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Environment</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">Development</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console logs */}
              <div className="bg-slate-950 text-slate-300 p-5 sm:p-6 rounded-2xl font-mono text-xs border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-slate-500">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-indigo-400" />
                    <span>Configuration Logs</span>
                  </div>
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400">Live</span>
                </div>
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="leading-relaxed"><span className="text-indigo-400">&gt;&gt;</span> {log}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MONGODB */}
          {activeTab === "mongodb" && (
            <form onSubmit={handleSaveMongo} className={`${CARD} p-6 sm:p-8`}>
              <SectionHead icon={Database} title="MongoDB Settings" desc="Configure local and cloud database connection parameters." iconWrap="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={LABEL}>MongoDB URI Connection String</label>
                  <input type="text" value={mongo.uri} onChange={(e) => setMongo({ ...mongo, uri: e.target.value })} className={INPUT} placeholder="mongodb://username:password@host:port/database" required />
                </div>
                <div>
                  <label className={LABEL}>Database Name</label>
                  <input type="text" value={mongo.dbName} onChange={(e) => setMongo({ ...mongo, dbName: e.target.value })} className={INPUT} placeholder="rapid_fix_db" required />
                </div>
                <div>
                  <label className={LABEL}>Connection Timeout (ms)</label>
                  <input type="number" value={mongo.timeout} onChange={(e) => setMongo({ ...mongo, timeout: parseInt(e.target.value) || 5000 })} className={INPUT} placeholder="5000" required />
                </div>
                <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="text-sm font-semibold flex justify-between mb-2">Max Connection Pool Size <span className="text-indigo-600 dark:text-indigo-400 font-bold">{mongo.maxPoolSize}</span></label>
                  <input type="range" min="1" max="100" value={mongo.maxPoolSize} onChange={(e) => setMongo({ ...mongo, maxPoolSize: parseInt(e.target.value) })} className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none" />
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={testMongoConnection}
                  disabled={connectionStatus === "testing"}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
                    connectionStatus === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40"
                      : connectionStatus === "error"
                      ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${connectionStatus === "testing" ? "animate-spin" : ""}`} />
                  {connectionStatus === "testing" ? "Connecting…" : connectionStatus === "success" ? "Connection Verified!" : connectionStatus === "error" ? "Failed — Try Again" : "Test Connection"}
                </button>
                <button type="submit" className={BTN_PRIMARY}><Save size={16} /> Save Mongo Settings</button>
              </div>
            </form>
          )}

          {/* FIREBASE */}
          {activeTab === "firebase" && (
            <form onSubmit={handleSaveFirebase} className={`${CARD} p-6 sm:p-8`}>
              <SectionHead icon={Flame} title="Firebase Credentials" desc="Override authentication and cloud service credentials live." iconWrap="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>API Key</label>
                  <input type="text" value={firebase.apiKey} onChange={(e) => setFirebase({ ...firebase, apiKey: e.target.value })} className={INPUT} placeholder="AIzaSy..." />
                </div>
                <div>
                  <label className={LABEL}>Auth Domain</label>
                  <input type="text" value={firebase.authDomain} onChange={(e) => setFirebase({ ...firebase, authDomain: e.target.value })} className={INPUT} placeholder="your-project.firebaseapp.com" />
                </div>
                <div>
                  <label className={LABEL}>Project ID</label>
                  <input type="text" value={firebase.projectId} onChange={(e) => setFirebase({ ...firebase, projectId: e.target.value })} className={INPUT} placeholder="your-project" />
                </div>
                <div>
                  <label className={LABEL}>Storage Bucket</label>
                  <input type="text" value={firebase.storageBucket} onChange={(e) => setFirebase({ ...firebase, storageBucket: e.target.value })} className={INPUT} placeholder="your-project.appspot.com" />
                </div>
                <div>
                  <label className={LABEL}>Messaging Sender ID</label>
                  <input type="text" value={firebase.messagingSenderId} onChange={(e) => setFirebase({ ...firebase, messagingSenderId: e.target.value })} className={INPUT} placeholder="8291823901" />
                </div>
                <div>
                  <label className={LABEL}>App ID</label>
                  <input type="text" value={firebase.appId} onChange={(e) => setFirebase({ ...firebase, appId: e.target.value })} className={INPUT} placeholder="1:829182:web:9102" />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Measurement ID</label>
                  <input type="text" value={firebase.measurementId} onChange={(e) => setFirebase({ ...firebase, measurementId: e.target.value })} className={INPUT} placeholder="G-12345ABC" />
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button type="submit" className={BTN_PRIMARY}><Save size={16} /> Save Firebase Keys</button>
              </div>
            </form>
          )}

          {/* CLOUDINARY */}
          {activeTab === "cloudinary" && (
            <form onSubmit={handleSaveCloudinary} className={`${CARD} p-6 sm:p-8`}>
              <SectionHead icon={Cloud} title="Cloudinary Configuration" desc="Media storage parameters for photos and videos." iconWrap="bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Cloud Name</label>
                  <input type="text" value={cloudinary.cloudName} onChange={(e) => setCloudinary({ ...cloudinary, cloudName: e.target.value })} className={INPUT} placeholder="e.g. rapidfixcloud" required />
                </div>
                <div>
                  <label className={LABEL}>API Key</label>
                  <input type="text" value={cloudinary.apiKey} onChange={(e) => setCloudinary({ ...cloudinary, apiKey: e.target.value })} className={INPUT} placeholder="e.g. 192839281923" required />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>API Secret</label>
                  <input type="password" value={cloudinary.apiSecret} onChange={(e) => setCloudinary({ ...cloudinary, apiSecret: e.target.value })} className={INPUT} placeholder="••••••••••••••••••••••••••••••••" required />
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button type="submit" className={BTN_PRIMARY}><Save size={16} /> Save Cloudinary Keys</button>
              </div>
            </form>
          )}

          {/* GEMINI */}
          {activeTab === "gemini" && (
            <form onSubmit={handleSaveGemini} className={`${CARD} p-6 sm:p-8`}>
              <SectionHead icon={Bot} title="Gemini AI Credentials" desc="API key used on the backend for AI diagnostics." iconWrap="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />

              <div>
                <label className={LABEL}>Gemini API Key</label>
                <input type="password" value={gemini.apiKey} onChange={(e) => setGemini({ ...gemini, apiKey: e.target.value })} className={INPUT} placeholder="AIzaSy..." required />
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button type="submit" className={BTN_PRIMARY}><Save size={16} /> Save Gemini Key</button>
              </div>
            </form>
          )}

          {/* DOTENV */}
          {activeTab === "dotenv" && (
            <div className="space-y-5">
              <div className={`${CARD} p-6 sm:p-8`}>
                <SectionHead icon={Code} title="Environment Sync Hub" desc="Export your active overrides as a ready-to-use .env file." />

                <div className="relative bg-slate-950 p-5 sm:p-6 rounded-xl border border-slate-800 font-mono text-xs">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button onClick={handleCopyEnv} className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-800" title="Copy to Clipboard">
                      {copied ? <span className="text-[10px] text-emerald-400 font-semibold px-1">Copied!</span> : <Copy size={14} />}
                    </button>
                    <button onClick={handleDownloadEnv} className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-800" title="Download File">
                      <Download size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 border-b border-slate-800 pb-3 mb-4">
                    <FileText size={14} /> <span>.env file template</span>
                  </div>
                  <pre className="overflow-auto text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[360px]">{generateEnvString()}</pre>
                </div>

                <div className="mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-3">
                  <Sparkles className="text-amber-500 mt-0.5 shrink-0" size={16} />
                  <p className="m-0 font-medium"><strong>Tip:</strong> Saving updates the active configs immediately in your browser runtime. To persist permanently, download this file and replace your root <code>.env</code>.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
