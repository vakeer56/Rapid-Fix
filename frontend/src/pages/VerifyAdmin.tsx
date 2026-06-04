import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  BadgeCheck,
  XCircle,
  FileText,
  Star,
  RefreshCw,
  LogOut,
  Lock,
  Inbox,
  Eye,
  Briefcase,
  Phone,
  Mail,
  ShieldAlert,
  Trash2,
  RotateCcw,
  ChevronRight,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import api from "../service/api";
import { usePopup } from "../context/PopupContext";

interface PendingWorker {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  experience?: number;
  categories?: string[];
  completedJobs?: number;
  rating?: { totalSum: number; totalCount: number };
  governmentVerification?: {
    status: string;
    documentType?: string;
    documentNumber?: string;
    documentImages?: string[];
    submittedAt?: string;
  };
}

interface AdminComplaint {
  _id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  worker_id?: { name?: string; phone?: string; email?: string };
  user_id?: { name?: string; phone?: string; email?: string };
}

const CARD = "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm";

export default function VerifyAdmin() {
  const { showAlert, showConfirm } = usePopup();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem("rf_verify_admin_authenticated") === "true"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [activeTab, setActiveTab] = useState<"verifications" | "complaints">("verifications");

  // Verification queue
  const [workers, setWorkers] = useState<PendingWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Complaints queue
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (username === "admin123" && password === "test123") {
      sessionStorage.setItem("rf_verify_admin_authenticated", "true");
      setIsAuthenticated(true);
    } else {
      setAuthError("Invalid administrator credentials. Access Denied.");
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("rf_verify_admin_authenticated");
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
  };

  // ─── Verifications ──────────────────────────────────────────────────────
  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/verification/admin/pending");
      if (res.data && res.data.success) {
        setWorkers(res.data.workers || []);
      }
    } catch (err) {
      console.error("Failed to fetch pending verifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const avg = (r?: { totalSum: number; totalCount: number }) =>
    r && r.totalCount > 0 ? (r.totalSum / r.totalCount).toFixed(1) : "0.0";

  const handleApprove = async (id: string) => {
    const confirm = await showConfirm(
      "Approve Verification",
      "Confirm the government documents are valid and approve this worker as a Verified Pro?"
    );
    if (!confirm) return;
    setActioningId(id);
    try {
      const res = await api.put(`/verification/admin/approve/${id}`);
      if (res.data && res.data.success) {
        await showAlert("Approved", "Worker has been approved as Verified Pro.", "success");
        fetchPending();
      }
    } catch (err: any) {
      await showAlert("Error", err?.response?.data?.message || "Failed to approve.", "error");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt(
      "Enter a reason for rejection (shown to the worker so they can resubmit):",
      ""
    );
    if (reason === null) return; // cancelled
    setActioningId(id);
    try {
      const res = await api.put(`/verification/admin/reject/${id}`, { rejectionReason: reason });
      if (res.data && res.data.success) {
        await showAlert("Rejected", "Worker's documents have been rejected.", "success");
        fetchPending();
      }
    } catch (err: any) {
      await showAlert("Error", err?.response?.data?.message || "Failed to reject.", "error");
    } finally {
      setActioningId(null);
    }
  };

  // ─── Complaints ─────────────────────────────────────────────────────────
  const fetchComplaints = async () => {
    setComplaintsLoading(true);
    try {
      const res = await api.get("/complaints/admin/all");
      if (res.data && res.data.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err) {
      console.error("Failed to fetch admin complaints:", err);
    } finally {
      setComplaintsLoading(false);
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    const confirm = await showConfirm(
      "Cancel & Delete Complaint",
      "Permanently cancel and delete this complaint? This is irreversible and removes it from the worker's record."
    );
    if (!confirm) return;
    try {
      const res = await api.delete(`/complaints/admin/delete/${id}`);
      if (res.data && res.data.success) {
        await showAlert("Complaint Cancelled", "The complaint has been deleted.", "success");
        fetchComplaints();
      }
    } catch (err: any) {
      await showAlert("Deletion Error", err?.response?.data?.message || "Failed to delete complaint.", "error");
    }
  };

  const handleRevokeDispute = async (id: string) => {
    const confirm = await showConfirm(
      "Revoke Worker Dispute",
      "Revoke the dispute? This rejects the worker's false-claim report and keeps the complaint active on their profile."
    );
    if (!confirm) return;
    try {
      const res = await api.put(`/complaints/admin/revoke-dispute/${id}`);
      if (res.data && res.data.success) {
        await showAlert("Dispute Revoked", "The worker's dispute has been rejected. The complaint is active again.", "success");
        fetchComplaints();
      }
    } catch (err: any) {
      await showAlert("Revoke Error", err?.response?.data?.message || "Failed to revoke dispute.", "error");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === "verifications") fetchPending();
    if (activeTab === "complaints") fetchComplaints();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab]);

  // ─── Login gate ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

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
                <LayoutDashboard size={26} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Manage verifications and complaints.</p>
            </div>

            {authError && (
              <div className="mb-6 flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl px-4 py-3">
                ⚠ {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Admin Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin123"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-lg font-bold text-white text-sm bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock size={15} /> Authenticate
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const navItems: { id: typeof activeTab; label: string; icon: LucideIcon; count: number }[] = [
    { id: "verifications", label: "Verifications", icon: BadgeCheck, count: workers.length },
    { id: "complaints", label: "Complaints", icon: ShieldAlert, count: complaints.length },
  ];

  // ─── Authenticated view ───────────────────────────────────────────────────
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
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Admin <span className="hidden sm:inline text-slate-400 font-medium">Panel</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (activeTab === "verifications" ? fetchPending() : fetchComplaints())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw size={13} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold transition-all cursor-pointer">
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
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                  {item.count}
                </span>
                {active && <ChevronRight size={14} className="hidden lg:block opacity-70" />}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="space-y-6 min-w-0">
          {/* ─────────────── VERIFICATIONS ─────────────── */}
          {activeTab === "verifications" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                    <BadgeCheck className="text-indigo-500" size={22} /> Pending Verifications
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Approve to grant the <span className="font-semibold text-indigo-600 dark:text-indigo-400">Verified Pro</span> badge, or reject with a reason.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-100 dark:border-indigo-500/20">
                  <Inbox size={13} /> {workers.length} in queue
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="animate-spin text-indigo-500 mb-3" size={30} />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Loading verification queue…</p>
                </div>
              ) : workers.length === 0 ? (
                <div className={`${CARD} flex flex-col items-center justify-center py-20 text-center`}>
                  <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 mb-4"><CheckCircle size={36} /></div>
                  <h3 className="text-base font-bold">Queue is clear</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">There are no pending document submissions to review.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {workers.map((w) => (
                    <div key={w._id} className={`${CARD} p-5 sm:p-6`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">
                            {w.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-white">{w.name}</h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              <a href={`tel:${w.phone}`} className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"><Phone size={11} /> {w.phone}</a>
                              {w.email && <a href={`mailto:${w.email}`} className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"><Mail size={11} /> {w.email}</a>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleApprove(w._id)}
                            disabled={actioningId === w._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
                          >
                            {actioningId === w._id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Approve
                          </button>
                          <button
                            onClick={() => handleReject(w._id)}
                            disabled={actioningId === w._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 py-5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-500"><Star size={15} /></div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{avg(w.rating)}</p>
                            <p className="text-[10px] text-slate-400">{w.rating?.totalCount || 0} ratings</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"><CheckCircle size={15} /></div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{w.completedJobs || 0}</p>
                            <p className="text-[10px] text-slate-400">jobs done</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500"><Briefcase size={15} /></div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{w.experience || 0} yrs</p>
                            <p className="text-[10px] text-slate-400">experience</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">
                          <FileText size={14} className="text-indigo-500" />
                          {w.governmentVerification?.documentType || "Document"}
                          {w.governmentVerification?.documentNumber && (
                            <span className="text-slate-400 font-medium font-mono">· {w.governmentVerification.documentNumber}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {(w.governmentVerification?.documentImages || []).map((url, i) => (
                            <button
                              key={i}
                              onClick={() => setPreview(url)}
                              className="group relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors cursor-pointer"
                            >
                              <img src={url} alt={`document ${i + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Eye size={18} /></span>
                            </button>
                          ))}
                          {(!w.governmentVerification?.documentImages || w.governmentVerification.documentImages.length === 0) && (
                            <p className="text-xs italic text-slate-400">No document images uploaded.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─────────────── COMPLAINTS ─────────────── */}
          {activeTab === "complaints" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                    <ShieldAlert className="text-rose-500" size={22} /> Complaints Review
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Review disputed claims, verify details with the client, and cancel false complaints or revoke invalid disputes.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-100 dark:border-rose-500/20">
                  <Inbox size={13} /> {complaints.length} disputed
                </span>
              </div>

              {complaintsLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="animate-spin text-rose-500 mb-3" size={30} />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Loading complaints…</p>
                </div>
              ) : complaints.length === 0 ? (
                <div className={`${CARD} flex flex-col items-center justify-center py-20 text-center`}>
                  <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 mb-4"><CheckCircle size={36} /></div>
                  <h3 className="text-base font-bold">Queue is clear</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">There are no disputed complaints awaiting review.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {complaints.map((c) => (
                    <div key={c._id} className={`${CARD} p-5 sm:p-6`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {c.status === "disputed" && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[9px] font-black uppercase tracking-wider">
                                Disputed · False Claim
                              </span>
                            )}
                            <h3 className="font-bold text-slate-900 dark:text-white">{c.title}</h3>
                          </div>
                          <p className="text-[11px] text-slate-400 font-semibold">
                            Filed {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0 flex-wrap">
                          {c.status === "disputed" && (
                            <button
                              onClick={() => handleRevokeDispute(c._id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                            >
                              <RotateCcw size={13} /> Revoke Dispute
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteComplaint(c._id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Trash2 size={13} /> Cancel
                          </button>
                        </div>
                      </div>

                      <div className="py-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{c.description}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        <div>
                          <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1 mb-1.5"><ShieldAlert size={12} /> Reported Worker</h4>
                          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 font-semibold">
                            <p>{c.worker_id?.name || "N/A"}</p>
                            {c.worker_id?.phone && <a href={`tel:${c.worker_id.phone}`} className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"><Phone size={11} /> {c.worker_id.phone}</a>}
                          </div>
                        </div>
                        <div className="sm:border-l border-slate-200 dark:border-slate-700 sm:pl-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-wider flex items-center gap-1 mb-1.5"><CheckCircle size={12} /> Reporting Client</h4>
                          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 font-semibold">
                            <p>{c.user_id?.name || "N/A"}</p>
                            {c.user_id?.phone && <a href={`tel:${c.user_id.phone}`} className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"><Phone size={11} /> {c.user_id.phone}</a>}
                            {c.user_id?.email && <a href={`mailto:${c.user_id.email}`} className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"><Mail size={11} /> {c.user_id.email}</a>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Document preview lightbox */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPreview(null)}>
          <button onClick={() => setPreview(null)} className="absolute top-5 right-5 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
            <XCircle size={22} />
          </button>
          <img src={preview} alt="document preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
