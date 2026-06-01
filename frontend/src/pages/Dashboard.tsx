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
  Image as ImageIcon,
  Briefcase,
  ShieldCheck,
  Star,
  Zap,
  Check,
  Loader2
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
    district: string;
    state: string;
    pin_code: number;
  };
  assigned_worker?: {
    name: string;
    experience: number;
    phone: string;
  };
}

export default function Dashboard() {
  const { appUser } = useAuth();
  
  // Customer states
  const [requests, setRequests] = useState<ProblemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [problemOpen, setProblemOpen] = useState(false);

  // Worker-specific states
  const [activeTab, setActiveTab] = useState<"available" | "active">("available");
  const [availableJobs, setAvailableJobs] = useState<ProblemRequest[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<ProblemRequest[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState("");
  const [claimLoadingId, setClaimLoadingId] = useState<string | null>(null);
  const [resolveLoadingId, setResolveLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (appUser) {
      if (appUser.role === "worker") {
        fetchAvailableJobs();
        fetchActiveAssignments();
      } else {
        fetchRequests();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser]);

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
      if (err?.response?.status === 404) {
        setRequests([]);
      } else {
        setError("Error fetching service history. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableJobs = async () => {
    if (!appUser?._id) return;
    setAvailableLoading(true);
    setAvailableError("");
    try {
      const res = await api.get(`/getProblems/getAllProblems?workerId=${appUser._id}`);
      setAvailableJobs(res.data.problems || []);
    } catch (err: any) {
      console.error("Worker fetch available jobs error:", err);
      if (err?.response?.status === 404) {
        setAvailableJobs([]);
      } else {
        setAvailableError(err?.response?.data?.message || "Failed to load matching available jobs.");
      }
    } finally {
      setAvailableLoading(false);
    }
  };

  const fetchActiveAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/problem/user");
      if (res.data && res.data.success) {
        setActiveAssignments(res.data.problems || []);
      } else {
        setError("Failed to load active assignments.");
      }
    } catch (err: any) {
      console.error("Worker fetch active assignments error:", err);
      if (err?.response?.status === 404) {
        setActiveAssignments([]);
      } else {
        setError("Error fetching active assignments.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaimJob = async (problemId: string) => {
    if (!appUser?._id) return;
    setClaimLoadingId(problemId);
    try {
      const res = await api.post("/worker/accept-problem", {
        workerId: appUser._id,
        problemId
      });
      if (res.data.success) {
        await Promise.all([fetchAvailableJobs(), fetchActiveAssignments()]);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to claim the job.");
    } finally {
      setClaimLoadingId(null);
    }
  };

  const handleResolveJob = async (problemId: string) => {
    setResolveLoadingId(problemId);
    try {
      const res = await api.patch(`/problem/ResolveProblem/${problemId}`);
      if (res.status === 200) {
        await Promise.all([fetchAvailableJobs(), fetchActiveAssignments()]);
      }
    } catch (err: any) {
      alert("Failed to resolve job.");
    } finally {
      setResolveLoadingId(null);
    }
  };

  const renderStars = (sum = 0, count = 0) => {
    if (count === 0) {
      return (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              className="text-slate-600"
            />
          ))}
          <span className="text-xs font-bold text-slate-400 ml-1.5 animate-pulse">
            Rating Not Available (0 reviews)
          </span>
        </div>
      );
    }
    const avg = sum / count;
    const rounded = Math.round(avg);
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < rounded ? "text-amber-400 fill-amber-400 animate-pulse" : "text-slate-600"}
          />
        ))}
        <span className="text-xs font-bold text-slate-400 ml-1.5">
          {avg.toFixed(1)} ({count} reviews)
        </span>
      </div>
    );
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

  // ─── Service Partner Dashboard Panel ───
  if (appUser?.role === "worker") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-white font-sans transition-colors duration-300">
        <Navbar />

        <main className="flex-grow pt-28 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8">
          {/* Left Panel: Worker Profile and Stats Card */}
          <div className="w-full lg:w-1/3 shrink-0 flex flex-col gap-6">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              {/* Background ambient lighting */}
              <div className="absolute -right-16 -top-16 w-36 h-36 bg-orange-600/10 rounded-full blur-2xl pointer-events-none" />
              
              {/* Profile Image & Identification */}
              <div className="flex flex-col items-center text-center">
                <div className="relative group mb-4">
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-orange-500 overflow-hidden">
                    {appUser.photo ? (
                      <img src={appUser.photo} alt={appUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-orange-500 text-3xl font-bold bg-slate-950">
                        {appUser.name[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <h2 className="text-xl font-bold text-white tracking-tight">{appUser.name}</h2>
                  {appUser.verificationStatus && (
                    <ShieldCheck className="text-orange-500" size={18} />
                  )}
                </div>

                <span className={`text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full border mb-4 ${
                  appUser.verificationStatus 
                    ? "bg-orange-500/10 border-orange-500/30 text-orange-400" 
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}>
                  {appUser.verificationStatus ? "Verified Service Partner" : "Pending Verification"}
                </span>

                {/* Rating display */}
                <div className="mb-6 bg-slate-950/40 rounded-2xl px-4 py-2 border border-slate-850">
                  {renderStars(
                    (appUser as any).rating?.totalSum,
                    (appUser as any).rating?.totalCount
                  )}
                </div>
              </div>

              {/* Stats / Details Section */}
              <div className="space-y-4 border-t border-slate-800/60 pt-6 text-sm">
                <div className="flex items-start gap-3">
                  <Briefcase size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-500">Experience</h4>
                    <p className="text-slate-200 font-medium">{appUser.experience || 0} Years In-field</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-500">Located Address</h4>
                    <p className="text-slate-300 font-medium leading-relaxed">{appUser.located_address || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Wrench size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  <div className="w-full">
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">Preferred Locales</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {appUser.preferred_areas && appUser.preferred_areas.length > 0 ? (
                        appUser.preferred_areas.map((area, index) => (
                          <span key={index} className="text-[10px] font-bold bg-slate-800 text-orange-400 px-2 py-0.5 border border-slate-700 rounded">
                            {area}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-500">None added</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Tabs, Feeds and Task Center */}
          <div className="w-full lg:w-2/3 flex flex-col gap-6">
            {/* Sliding Pill Tab Switcher */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-1.5 flex shadow-xl relative z-10 select-none">
              <div 
                className="absolute top-1.5 bottom-1.5 bg-orange-600 rounded-xl transition-all duration-300"
                style={{
                  left: activeTab === "available" ? "6px" : "50%",
                  right: activeTab === "available" ? "50%" : "6px",
                }}
              />
              <button
                type="button"
                onClick={() => setActiveTab("available")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-sm z-10 transition-colors duration-200 cursor-pointer ${
                  activeTab === "available" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Available Dispatch Feed ({availableJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-sm z-10 transition-colors duration-200 cursor-pointer ${
                  activeTab === "active" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Claimed Repair Track ({activeAssignments.length})
              </button>
            </div>

            {/* Content Lists */}
            {activeTab === "available" ? (
              // Available Jobs Dispatch Queue
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Zap className="text-orange-500 fill-orange-500" size={20} />
                    Live Matching Requests
                  </h3>
                  <button 
                    onClick={fetchAvailableJobs} 
                    className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-all hover:underline"
                  >
                    Fetch Dispatch Feed
                  </button>
                </div>

                {availableLoading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 size={36} className="animate-spin text-orange-500 mb-4" />
                    <p className="text-slate-400 text-xs font-semibold">Matching you with nearby clients…</p>
                  </div>
                ) : availableError ? (
                  <div className="bg-red-950/20 border border-red-900 rounded-3xl p-8 text-center text-red-400 max-w-lg mx-auto">
                    <AlertCircle size={36} className="mx-auto mb-3" />
                    <h3 className="font-bold text-base mb-1">Queue Disconnected</h3>
                    <p className="text-xs">{availableError}</p>
                  </div>
                ) : availableJobs.length === 0 ? (
                  /* Premium Empty State */
                  <div className="bg-slate-900/40 rounded-3xl p-12 text-center border border-slate-850 shadow-xl max-w-xl mx-auto flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-5">
                      <Zap className="w-7 h-7 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1.5">Dispatch Queue Clear</h3>
                    <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-6">
                      No active customer requests are currently matching your preferred areas or located district. Refresh the feed or expand your localities to find new jobs.
                    </p>
                    <button
                      onClick={fetchAvailableJobs}
                      className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Search Dispatch Queue
                    </button>
                  </div>
                ) : (
                  /* Cards Feed */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableJobs.map((job) => (
                      <div 
                        key={job._id}
                        className="bg-slate-900/40 rounded-3xl border border-slate-800/80 hover:border-orange-500/40 transition-all duration-300 p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-orange-500/[0.02]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-base text-white line-clamp-1">{job.name}</h4>
                                {job.urgency && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded">
                                    Urgent
                                  </span>
                                )}
                              </div>
                              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                <Calendar size={11} />
                                {new Date(job.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </span>
                            </div>
                          </div>

                          <p className="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-3">{job.description}</p>

                          {job.address && (
                            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-950/40 rounded-2xl p-3 border border-slate-850 mb-4">
                              <MapPin size={12} className="text-orange-500 mt-0.5 shrink-0" />
                              <span>{job.address.address}, {job.address.area}, {job.address.city}</span>
                            </div>
                          )}

                          {/* Media attachments */}
                          {(job.picture || job.video) && (
                            <div className="flex items-center gap-3 mb-4">
                              {job.picture && (
                                <a 
                                  href={job.picture} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-all hover:underline"
                                >
                                  <ImageIcon size={12} /> View Photo
                                </a>
                              )}
                              {job.video && (
                                <a 
                                  href={job.video} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-all hover:underline"
                                >
                                  <Video size={12} /> View Video
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleClaimJob(job._id)}
                          disabled={claimLoadingId === job._id}
                          className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs transition-all active:scale-[0.98] shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          {claimLoadingId === job._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} />
                              Claim Job Dispatch
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Claimed Repair Assignments Center
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Wrench className="text-orange-500" size={20} />
                    Active Claimed Repair Work
                  </h3>
                  <button 
                    onClick={fetchActiveAssignments} 
                    className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-all hover:underline"
                  >
                    Refresh Statuses
                  </button>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 size={36} className="animate-spin text-orange-500 mb-4" />
                    <p className="text-slate-400 text-xs font-semibold">Loading assignments list…</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-950/20 border border-red-900 rounded-3xl p-8 text-center text-red-400 max-w-lg mx-auto">
                    <AlertCircle size={36} className="mx-auto mb-3" />
                    <h3 className="font-bold text-base mb-1">Retrieval Failed</h3>
                    <p className="text-xs">{error}</p>
                  </div>
                ) : activeAssignments.length === 0 ? (
                  /* Elegant Empty State */
                  <div className="bg-slate-900/40 rounded-3xl p-12 text-center border border-slate-850 shadow-xl max-w-xl mx-auto flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-5">
                      <Wrench className="w-7 h-7 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1.5">No Active Assignments</h3>
                    <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-6">
                      You are not currently tracking any claimed customer requests. Claim a request from the Dispatch feed to start repairing immediately.
                    </p>
                    <button
                      onClick={() => setActiveTab("available")}
                      className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      View Available Dispatches
                    </button>
                  </div>
                ) : (
                  /* Cards Feed */
                  <div className="grid grid-cols-1 gap-6">
                    {activeAssignments.map((assignment) => (
                      <div 
                        key={assignment._id}
                        className={`bg-slate-900/40 rounded-3xl border transition-all duration-300 p-6 flex flex-col sm:flex-row justify-between gap-6 hover:shadow-xl ${
                          assignment.urgency ? "border-red-500/20" : "border-slate-800/80"
                        }`}
                      >
                        <div className="flex-grow space-y-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-lg text-white line-clamp-1">{assignment.name}</h4>
                              {assignment.urgency && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded">
                                  Urgent
                                </span>
                              )}
                              {getStatusBadge(assignment.status)}
                            </div>
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                              <Calendar size={11} />
                              Assigned {new Date(assignment.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                            </span>
                          </div>

                          <p className="text-slate-350 text-xs leading-relaxed max-w-xl">{assignment.description}</p>

                          {assignment.address && (
                            <div className="flex flex-col gap-2 text-xs text-slate-400 bg-slate-950/40 rounded-2xl p-4 border border-slate-850">
                              <div className="flex items-start gap-2">
                                <MapPin size={13} className="text-orange-500 mt-0.5 shrink-0" />
                                <span>
                                  <strong>Exact Address:</strong> {assignment.address.address}, {assignment.address.area}, {assignment.address.city}, {assignment.address.district}, {assignment.address.state} - {assignment.address.pin_code}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Media attachments */}
                          {(assignment.picture || assignment.video) && (
                            <div className="flex items-center gap-3">
                              {assignment.picture && (
                                <a 
                                  href={assignment.picture} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-all hover:underline"
                                >
                                  <ImageIcon size={12} /> View Photo
                                </a>
                              )}
                              {assignment.video && (
                                <a 
                                  href={assignment.video} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-all hover:underline"
                                >
                                  <Video size={12} /> View Video
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Control Actions Panel */}
                        <div className="shrink-0 flex flex-col gap-3 justify-center w-full sm:w-48">
                          {assignment.status !== "resolved" ? (
                            <>
                              <button
                                onClick={() => handleResolveJob(assignment._id)}
                                disabled={resolveLoadingId === assignment._id}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                              >
                                {resolveLoadingId === assignment._id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <>
                                    <Check size={14} />
                                    Mark Resolved
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                              <CheckCircle2 size={14} />
                              Completed
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // ─── Customer Dashboard Panel ───
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
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center mb-6">
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
                      <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/40 mb-4">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-orange-400 rounded-xl text-xs font-bold no-underline transition-colors"
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
