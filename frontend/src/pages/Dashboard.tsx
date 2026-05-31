import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Problem from "../components/Problem";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";
import { 
  AlertCircle, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  PlusCircle, 
  Video, 
  Image as ImageIcon 
} from "lucide-react";

interface ProblemRequest {
  _id: string;
  name: string;
  description: string;
  urgency: boolean;
  status: "unresolved" | "pending" | "resolved";
  createdAt: string;
  picture?: string;
  video?: string;
  address?: {
    address: string;
    area: string;
    city: string;
  };
  assigned_worker?: {
    name: string;
    experience: number;
    phone: string;
  };
}

export default function Dashboard() {
  const { appUser } = useAuth();
  const [requests, setRequests] = useState<ProblemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [problemOpen, setProblemOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/problem/user");
      if (res.data && res.data.success) {
        setRequests(res.data.problems || []);
      } else {
        setError("Failed to load requests.");
      }
    } catch (err: any) {
      console.error(err);
      // If no problems found (404), treat as empty array
      if (err?.response?.status === 404) {
        setRequests([]);
      } else {
        setError("Error fetching service history. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ProblemRequest["status"]) => {
    switch (status) {
      case "unresolved":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            <AlertCircle size={12} />
            Unresolved
          </span>
        );
      case "resolved":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
            <Clock size={12} />
            Searching Experts
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main className="flex-grow pt-28 pb-16 px-6 md:px-16 max-w-7xl mx-auto w-full">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 mb-8 text-white shadow-xl shadow-blue-900/10">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back, {appUser?.name || "Customer"} 👋
              </h1>
              <p className="text-blue-200 text-sm sm:text-base mt-2 max-w-lg">
                Raise new issues and track your home repairs in real-time. Need an urgent service? Our verified technicians are on standby.
              </p>
            </div>
            <button
              onClick={() => setProblemOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-450 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all shrink-0 cursor-pointer text-sm"
            >
              <PlusCircle size={18} />
              Raise Service Request
            </button>
          </div>
        </div>

        {/* Request Feed Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Wrench className="text-blue-600 dark:text-orange-500" size={22} />
              Your Repair Requests
            </h2>
            <button
              onClick={fetchRequests}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Refresh Statuses
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold">Retrieving history…</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-3xl p-8 text-center text-red-500 max-w-lg mx-auto">
              <AlertCircle size={40} className="mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Error Loading requests</h3>
              <p className="text-sm">{error}</p>
            </div>
          ) : requests.length === 0 ? (
            /* Elegant Empty State */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-slate-850 flex items-center justify-center mb-6">
                <Wrench className="w-8 h-8 text-blue-600 dark:text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Active Repair Requests</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-8">
                Your request feed is currently empty. Whenever you need something fixed, raise a request to immediately contact verified experts.
              </p>
              <button
                onClick={() => setProblemOpen(true)}
                className="bg-blue-900 hover:bg-blue-800 dark:bg-orange-600 dark:hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md text-sm cursor-pointer"
              >
                Raise your first request
              </button>
            </div>
          ) : (
            /* Cards Feed */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.map((req) => (
                <div 
                  key={req._id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">
                            {req.name}
                          </h3>
                          {req.urgency && (
                            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                              Urgent
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                          <Calendar size={12} />
                          {new Date(req.createdAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                        </span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    {/* Body description */}
                    <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed mb-4 line-clamp-2">
                      {req.description}
                    </p>

                    {/* Address details */}
                    {req.address && (
                      <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/40 mb-4">
                        <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <span>
                          {req.address.address}, {req.address.area}, {req.address.city}
                        </span>
                      </div>
                    )}

                    {/* Media Attachments */}
                    {(req.picture || req.video) && (
                      <div className="flex items-center gap-3 mb-4">
                        {req.picture && (
                          <a
                            href={req.picture}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            <ImageIcon size={14} />
                            View Photo
                          </a>
                        )}
                        {req.video && (
                          <a
                            href={req.video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            <Video size={14} />
                            View Clip
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Assigned worker footer info */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    {req.assigned_worker ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-indigo-400">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Technician Assigned</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{req.assigned_worker.name}</p>
                          </div>
                        </div>
                        <a
                          href={`tel:${req.assigned_worker.phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-blue-600 dark:text-orange-400 rounded-xl text-xs font-bold no-underline transition-colors"
                        >
                          <Phone size={12} />
                          Call Expert
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-xs italic font-medium">Finding the perfect professional for your location…</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Raise Issue Modal */}
      <Problem
        open={problemOpen}
        setopen={setProblemOpen}
        onProblemCreated={fetchRequests}
      />
    </div>
  );
}
