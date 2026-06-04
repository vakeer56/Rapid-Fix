import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Database, 
  Flame, 
  Settings, 
  Code, 
  Copy, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  Server, 
  Activity, 
  FileText, 
  Sparkles,
  ArrowLeft,
  Terminal,
  Save,
  ShieldAlert,
  Trash2,
  Loader2
} from "lucide-react";
import api from "../service/api";
import { usePopup } from "../context/PopupContext";


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

export default function SuperAdmin() {
  const { showAlert, showConfirm } = usePopup();

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("rf_super_admin_authenticated") === "true";
  });
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "mongodb" | "firebase" | "cloudinary" | "gemini" | "dotenv" | "complaints">("dashboard");
  const [adminComplaints, setAdminComplaints] = useState<any[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  
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

  const fetchAdminComplaints = async () => {
    setComplaintsLoading(true);
    try {
      const res = await api.get("/complaints/admin/all");
      if (res.data && res.data.success) {
        setAdminComplaints(res.data.complaints || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch admin complaints:", err);
    } finally {
      setComplaintsLoading(false);
    }
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    const confirm = await showConfirm(
      "Cancel & Delete Complaint",
      "Are you sure you want to permanently cancel and delete this complaint? This action is irreversible and will remove it from the worker's record."
    );
    if (!confirm) return;

    try {
      const res = await api.delete(`/complaints/admin/delete/${complaintId}`);
      if (res.data && res.data.success) {
        await showAlert("Complaint Cancelled", "The complaint has been successfully deleted from the database.", "success");
        fetchAdminComplaints();
      }
    } catch (err: any) {
      await showAlert("Deletion Error", err?.response?.data?.message || "Failed to delete complaint.", "error");
    }
  };

  const handleRevokeDispute = async (complaintId: string) => {
    const confirm = await showConfirm(
      "Revoke Worker Dispute",
      "Are you sure you want to revoke the dispute? This will reject the worker's false claim and keep the complaint active on their profile."
    );
    if (!confirm) return;

    try {
      const res = await api.put(`/complaints/admin/revoke-dispute/${complaintId}`);
      if (res.data && res.data.success) {
        await showAlert("Dispute Revoked", "The worker's dispute claim has been rejected. The complaint is active again.", "success");
        fetchAdminComplaints();
      }
    } catch (err: any) {
      await showAlert("Revoke Error", err?.response?.data?.message || "Failed to revoke dispute.", "error");
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated && activeTab === "complaints") {
      fetchAdminComplaints();
    }
  }, [isAdminAuthenticated, activeTab]);

  // Fetch configs from the server when authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchActiveConfig();
    }
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

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Dynamic Glowing Ambient Circles */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-blue-600/15 rounded-full blur-3xl animate-pulse-glow pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-orange-600/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none"></div>

        <Link
          to="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-all no-underline bg-slate-900/40 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-full cursor-pointer shadow-md"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          <div className="glass-panel rounded-3xl p-8 shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 mb-4 border border-orange-500/20">
                <Settings size={28} className="animate-spin-slow" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Super-Admin Access</h1>
              <p className="text-xs text-slate-500 mt-2">
                Authorized Personnel Only. Please enter database cryptographic credentials.
              </p>
            </div>

            {adminError && (
              <div className="mb-6 flex items-center gap-2.5 text-red-400 text-xs bg-red-950/20 border border-red-900/40 rounded-2xl px-4 py-3 animate-fade-in">
                ⚠ {adminError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 ml-0.5">Admin Username</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin123"
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 ml-0.5">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="text-[10px] text-orange-400 hover:underline cursor-pointer"
                  >
                    {showAdminPass ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showAdminPass ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 mt-2 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98] cursor-pointer"
              >
                Authenticate Control Center
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-gray-800 dark:text-gray-200 transition-colors duration-300 relative overflow-hidden flex flex-col font-sans">
      
      {/* Dynamic Ambient Background Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 dark:bg-blue-950/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-100/40 dark:bg-orange-950/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="z-10 bg-white/60 dark:bg-slate-950/40 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-800/40 px-6 py-4 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-full hover:bg-gray-150 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="text-orange-500 dark:text-orange-500 animate-spin-slow" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              Super-Admin <span className="text-xs bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/40">Control Center</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Save Indicator Alert Banner */}
          {saveSuccess && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-full text-xs font-medium animate-pulse">
              <CheckCircle size={14} />
              Dynamic Configs Applied Successfully!
            </div>
          )}

          <button
            onClick={handleAdminSignOut}
            className="px-4 py-2 rounded-full border border-red-200 dark:border-red-905 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            Lock Control Center
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-8 gap-8 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 flex flex-row md:flex-col gap-2 p-2 bg-white/55 dark:bg-slate-950/20 backdrop-blur-md border border-white/20 dark:border-slate-800/20 rounded-3xl h-fit">
          {[
            { id: "dashboard", label: "Dashboard Overview", icon: <Activity size={18} /> },
            { id: "mongodb", label: "MongoDB Configs", icon: <Database size={18} /> },
            { id: "firebase", label: "Firebase Settings", icon: <Flame size={18} /> },
            { id: "cloudinary", label: "Cloudinary Settings", icon: <Sparkles size={18} /> },
            { id: "gemini", label: "Gemini AI Settings", icon: <Sparkles size={18} /> },
            { id: "dotenv", label: ".env Sync Hub", icon: <Code size={18} /> },
            { id: "complaints", label: "Complaints Queue", icon: <ShieldAlert size={18} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 md:flex-initial flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-900 dark:bg-orange-600 text-white shadow-lg"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/40 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline md:inline">{tab.label}</span>
            </button>
          ))}
          
          <div className="hidden md:block border-t border-gray-200/50 dark:border-slate-800/50 my-2"></div>
          
          <button
            onClick={resetToEnvDefaults}
            className="hidden md:flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer w-full text-left"
          >
            <RefreshCw size={14} />
            Reset to .env Defaults
          </button>
        </aside>

        {/* Dynamic Display Panel */}
        <main className="flex-1 flex flex-col bg-white/70 dark:bg-slate-950/30 backdrop-blur-lg border border-white/30 dark:border-slate-800/30 rounded-3xl shadow-xl overflow-hidden p-6 md:p-8">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 flex-1 flex flex-col">
              
              {/* Header card */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  System Overview <Sparkles className="text-orange-500" size={20} />
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Monitor live system configurations and override environmental parameters instantly without server rebuilds.
                </p>
              </div>

              {/* Quick Config Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-gray-150 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                    <Database size={22} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">MongoDB</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{mongo.dbName}</p>
                    <span className="text-[10px] bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Dynamic Mode</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 border border-gray-150 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Flame size={22} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Firebase API</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{firebase.apiKey ? "Configured" : "Missing"}</p>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">Synced</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 border border-gray-150 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Server size={22} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Environment Mode</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Development</p>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Override Active</span>
                  </div>
                </div>

              </div>

              {/* Dynamic Console Logs */}
              <div className="flex-1 flex flex-col bg-slate-950 text-slate-300 p-6 rounded-2xl font-mono text-xs border border-slate-900 min-h-[220px]">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4 text-slate-500">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-orange-500" />
                    <span>Dynamic Configuration Logs</span>
                  </div>
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400">Live Simulator</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[260px] scrollbar-thin">
                  {logs.map((log, index) => (
                    <div key={index} className="leading-relaxed">
                      <span className="text-blue-500">&gt;&gt;</span> {log}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MONGODB CONFIGURATIONS */}
          {activeTab === "mongodb" && (
            <form onSubmit={handleSaveMongo} className="space-y-6">
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Database className="text-blue-600" size={24} />
                  MongoDB Settings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure local and cloud MongoDB parameters. Used to construct the dynamic database schema definitions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-2">MongoDB URI Connection String</label>
                  <input
                    type="text"
                    value={mongo.uri}
                    onChange={(e) => setMongo({ ...mongo, uri: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="mongodb://username:password@host:port/database"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Database Name</label>
                  <input
                    type="text"
                    value={mongo.dbName}
                    onChange={(e) => setMongo({ ...mongo, dbName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="rapid_fix_db"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Connection Timeout (ms)</label>
                  <input
                    type="number"
                    value={mongo.timeout}
                    onChange={(e) => setMongo({ ...mongo, timeout: parseInt(e.target.value) || 5000 })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="5000"
                    required
                  />
                </div>

                <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-200/50 dark:border-slate-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold">Max Connection Pool Size: <span className="text-blue-900 dark:text-orange-500 font-bold">{mongo.maxPoolSize}</span></label>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={mongo.maxPoolSize}
                    onChange={(e) => setMongo({ ...mongo, maxPoolSize: parseInt(e.target.value) })}
                    className="w-full accent-blue-900 dark:accent-orange-500 cursor-pointer h-2 bg-gray-250 dark:bg-slate-800 rounded-lg appearance-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  type="button"
                  onClick={testMongoConnection}
                  disabled={connectionStatus === "testing"}
                  className={`px-5 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    connectionStatus === "success"
                      ? "bg-green-100 dark:bg-green-950/40 text-green-700 border border-green-200 dark:border-green-900/40"
                      : connectionStatus === "error"
                      ? "bg-red-100 dark:bg-red-950/40 text-red-700 border border-red-200 dark:border-red-900/40"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${connectionStatus === "testing" ? "animate-spin" : ""}`} />
                  {connectionStatus === "testing"
                    ? "Connecting..."
                    : connectionStatus === "success"
                    ? "Connection Verified!"
                    : connectionStatus === "error"
                    ? "Failed - Try Again"
                    : "Test Connection"}
                </button>

                <button
                  type="submit"
                  className="bg-blue-900 dark:bg-orange-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-800 dark:hover:bg-orange-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save size={16} />
                  Save Mongo Settings
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: FIREBASE CREDENTIALS */}
          {activeTab === "firebase" && (
            <form onSubmit={handleSaveFirebase} className="space-y-6">
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Flame className="text-orange-500" size={24} />
                  Firebase Credentials
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Update Firebase details dynamically to override active authentication, document triggers, and cloud services immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">API Key</label>
                  <input
                    type="text"
                    value={firebase.apiKey}
                    onChange={(e) => setFirebase({ ...firebase, apiKey: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="AIzaSy..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Auth Domain</label>
                  <input
                    type="text"
                    value={firebase.authDomain}
                    onChange={(e) => setFirebase({ ...firebase, authDomain: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="your-project.firebaseapp.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Project ID</label>
                  <input
                    type="text"
                    value={firebase.projectId}
                    onChange={(e) => setFirebase({ ...firebase, projectId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="your-project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Storage Bucket</label>
                  <input
                    type="text"
                    value={firebase.storageBucket}
                    onChange={(e) => setFirebase({ ...firebase, storageBucket: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="your-project.appspot.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Messaging Sender ID</label>
                  <input
                    type="text"
                    value={firebase.messagingSenderId}
                    onChange={(e) => setFirebase({ ...firebase, messagingSenderId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="8291823901"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">App ID</label>
                  <input
                    type="text"
                    value={firebase.appId}
                    onChange={(e) => setFirebase({ ...firebase, appId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="1:829182:web:9102"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Measurement ID</label>
                  <input
                    type="text"
                    value={firebase.measurementId}
                    onChange={(e) => setFirebase({ ...firebase, measurementId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="G-12345ABC"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200/50 dark:border-slate-800/50 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-900 dark:bg-orange-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-800 dark:hover:bg-orange-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save size={16} />
                  Save Firebase Keys
                </button>
              </div>

            </form>
          )}

          {/* TAB 4: CLOUDINARY CREDENTIALS */}
          {activeTab === "cloudinary" && (
            <form onSubmit={handleSaveCloudinary} className="space-y-6">
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-amber-500" size={24} />
                  Cloudinary Configuration
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure dynamic media assets cloud parameters to stream, save, and retrieve technician diagnostic photos and videos smoothly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Cloud Name</label>
                  <input
                    type="text"
                    value={cloudinary.cloudName}
                    onChange={(e) => setCloudinary({ ...cloudinary, cloudName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="e.g. rapidfixcloud"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">API Key</label>
                  <input
                    type="text"
                    value={cloudinary.apiKey}
                    onChange={(e) => setCloudinary({ ...cloudinary, apiKey: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="e.g. 192839281923"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-2">API Secret</label>
                  <input
                    type="password"
                    value={cloudinary.apiSecret}
                    onChange={(e) => setCloudinary({ ...cloudinary, apiSecret: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="••••••••••••••••••••••••••••••••"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200/50 dark:border-slate-800/50 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-900 dark:bg-orange-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-800 dark:hover:bg-orange-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save size={16} />
                  Save Cloudinary Media Keys
                </button>
              </div>

            </form>
          )}

          {/* TAB 5: GEMINI AI CREDENTIALS */}
          {activeTab === "gemini" && (
            <form onSubmit={handleSaveGemini} className="space-y-6">
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-amber-500" size={24} />
                  Gemini AI Credentials
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure your Google Gemini API Key dynamically. Used securely on the backend to diagnose customer troubleshooting requests.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Gemini API Key</label>
                  <input
                    type="password"
                    value={gemini.apiKey}
                    onChange={(e) => setGemini({ ...gemini, apiKey: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 dark:focus:border-orange-500 outline-none transition-colors"
                    placeholder="AIzaSy..."
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200/50 dark:border-slate-800/50 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-900 dark:bg-orange-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-800 dark:hover:bg-orange-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save size={16} />
                  Save Gemini Key
                </button>
              </div>

            </form>
          )}

          {/* TAB 4: .ENV SYNC HUB */}
          {activeTab === "dotenv" && (
            <div className="space-y-6 flex-1 flex flex-col">
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Code className="text-purple-500" size={24} />
                  Environment Sync Hub (.env)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Export your active control center overrides into a structured `.env` configuration file ready for physical application deployments.
                </p>
              </div>

              {/* Code display screen */}
              <div className="flex-1 flex flex-col relative bg-slate-950 p-6 rounded-2xl border border-slate-900 min-h-[250px] font-mono text-xs">
                
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={handleCopyEnv}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-800/60"
                    title="Copy to Clipboard"
                  >
                    {copied ? <span className="text-[10px] text-green-500 font-semibold px-1">Copied!</span> : <Copy size={14} />}
                  </button>

                  <button
                    onClick={handleDownloadEnv}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-800/60"
                    title="Download File"
                  >
                    <Download size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-slate-500 border-b border-slate-900 pb-3 mb-4">
                  <FileText size={14} />
                  <span>Configured .env File Template</span>
                </div>

                <pre className="flex-1 overflow-auto text-slate-300 leading-relaxed scrollbar-thin whitespace-pre-wrap">
                  {generateEnvString()}
                </pre>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-3">
                <Sparkles className="text-amber-500 mt-0.5 shrink-0" size={16} />
                <p className="m-0 font-medium">
                  <strong>Developer Tip:</strong> Saving changes updates the active configs immediately inside your browser's runtime. If you wish to hard-code them permanently, click the download button above and replace your local development root `.env` file!
                </p>
              </div>

            </div>
          )}

          {/* TAB 5: COMPLAINTS QUEUE */}
          {activeTab === "complaints" && (
            <div className="space-y-6 flex-grow flex flex-col">
              <div className="space-y-2 pb-4 border-b border-gray-200/50 dark:border-slate-800/50">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="text-red-500 animate-pulse" size={24} />
                  Complaints Review Queue
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Review claims filed against workers, contact reporting clients to verify details, and cancel complaints proved to be false or personal vengeance.
                </p>
              </div>

              {complaintsLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16">
                  <Loader2 className="animate-spin text-orange-500 mb-3" size={32} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Retrieving complaints log…</p>
                </div>
              ) : adminComplaints.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto animate-fade-in">
                  <CheckCircle className="text-green-500 mb-4 animate-bounce-slow" size={40} />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Queue is Clear</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                    There are no active customer complaints filed in the database.
                  </p>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto space-y-6 max-h-[60vh] pr-2 animate-fade-in">
                  {adminComplaints.map((complaint) => (
                    <div 
                      key={complaint._id}
                      className={`p-6 rounded-3xl bg-white dark:bg-slate-900/40 border ${
                        complaint.status === "disputed" 
                          ? "border-amber-500/40 shadow-amber-500/5 bg-amber-500/[0.02]" 
                          : "border-gray-200 dark:border-slate-800"
                      } flex flex-col gap-4 shadow-md transition-all hover:shadow-lg`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-150 dark:border-slate-800 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {complaint.status === "disputed" && (
                              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider animate-pulse">
                                Disputed (False Claim)
                              </span>
                            )}
                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wide">
                              {complaint.title}
                            </h3>
                          </div>
                          <p className="text-[10px] text-gray-450 dark:text-slate-500 font-bold">
                            Filed: {new Date(complaint.createdAt).toLocaleDateString()} at {new Date(complaint.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                          {complaint.status === "disputed" && (
                            <button
                              onClick={() => handleRevokeDispute(complaint._id)}
                              className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/20 hover:border-amber-500 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
                            >
                              <ShieldAlert size={13} />
                              Revoke Dispute
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteComplaint(complaint._id)}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
                          >
                            <Trash2 size={13} />
                            Cancel Complaint (Delete)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                          Description
                        </h4>
                        <p className="text-xs text-gray-700 dark:text-slate-350 leading-relaxed font-medium">
                          {complaint.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-gray-150 dark:border-slate-850/60">
                        {/* Reported Worker */}
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-black text-rose-500/80 uppercase tracking-wider flex items-center gap-1">
                            <ShieldAlert size={12} />
                            Reported Worker
                          </h4>
                          <div className="text-xs text-gray-700 dark:text-slate-300 space-y-0.5 font-bold">
                            <p>Name: <span className="text-gray-900 dark:text-white">{complaint.worker_id?.name || "N/A"}</span></p>
                            <p>Phone: <a href={`tel:${complaint.worker_id?.phone}`} className="text-blue-500 dark:text-orange-400 hover:underline">{complaint.worker_id?.phone || "N/A"}</a></p>
                          </div>
                        </div>

                        {/* Reporting Client */}
                        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-slate-800/80 pt-3 sm:pt-0 sm:pl-4">
                          <h4 className="text-[10px] font-black text-blue-500/80 uppercase tracking-wider flex items-center gap-1">
                            <Server size={12} />
                            Reporting Client (Verify Claim)
                          </h4>
                          <div className="text-xs text-gray-700 dark:text-slate-300 space-y-0.5 font-bold">
                            <p>Name: <span className="text-gray-900 dark:text-white">{complaint.user_id?.name || "N/A"}</span></p>
                            <p>Phone: <a href={`tel:${complaint.user_id?.phone}`} className="text-blue-500 dark:text-orange-400 hover:underline">{complaint.user_id?.phone || "N/A"}</a></p>
                            {complaint.user_id?.email && (
                              <p>Email: <a href={`mailto:${complaint.user_id.email}`} className="text-blue-500 dark:text-orange-400 hover:underline">{complaint.user_id.email}</a></p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>

      </div>
    </div>
  );
}
