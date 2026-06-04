import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Problem from "../components/Problem";
import { useAuth } from "../context/AuthContext";
import { usePopup } from "../context/PopupContext";
import api from "../service/api";
import { 
  AlertCircle, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Phone, 
  PlusCircle, 
  Video, 
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  Star,
  Zap,
  Check,
  Loader2,
  Truck,
  X
} from "lucide-react";

interface ProblemRequest {
  _id: string;
  name: string;
  description: string;
  urgency: boolean;
  status: "unresolved" | "pending" | "on the way" | "in progress" | "resolved";
  createdAt: string;
  picture?: string;
  pictures?: string[];
  video?: string;
  videos?: string[];
  category?: string;
  address?: {
    address: string;
    area: string;
    city: string;
    district: string;
    state: string;
    pin_code: number;
  };
  assigned_worker?: {
    _id: string;
    name: string;
    experience: number;
    phone: string;
    photo?: string;
    rating?: {
      totalSum: number;
      totalCount: number;
    };
  };
  resolved_worker?: {
    _id: string;
    name: string;
    experience: number;
    phone: string;
    photo?: string;
    rating?: {
      totalSum: number;
      totalCount: number;
    };
  };
  userId?: {
    _id: string;
    name: string;
    phone: string;
  };
  amountReceived?: number;
}

export default function Dashboard() {
  const { appUser } = useAuth();
  const { showAlert, showConfirm } = usePopup();
  
  // Customer states
  const [requests, setRequests] = useState<ProblemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [problemOpen, setProblemOpen] = useState(false);

  // Worker-specific states
  const [activeTab, setActiveTab] = useState<"available" | "active" | "completed" | "reviews" | "complaints">("available");
  const [availableJobs, setAvailableJobs] = useState<ProblemRequest[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<ProblemRequest[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState("");
  const [claimLoadingId, setClaimLoadingId] = useState<string | null>(null);
  const [workerComplaints, setWorkerComplaints] = useState<any[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [newComplaintPopup, setNewComplaintPopup] = useState<any | null>(null);
  const [ownReviews, setOwnReviews] = useState<any[]>([]);
  const [ownReviewsLoading, setOwnReviewsLoading] = useState(false);

  // Worker Payout completion modal states
  const [completingProblemId, setCompletingProblemId] = useState<string | null>(null);
  const [payoutInputText, setPayoutInputText] = useState<string>("");
  const [completingLoading, setCompletingLoading] = useState<boolean>(false);

  // Progress loading state
  const [progressLoadingId, setProgressLoadingId] = useState<string | null>(null);

  // Review & Rating Modal states
  const [reviewingProblem, setReviewingProblem] = useState<ProblemRequest | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);

  // Complaint Modal states
  const [complainingProblem, setComplainingProblem] = useState<ProblemRequest | null>(null);
  const [complaintTitle, setComplaintTitle] = useState<string>("");
  const [complaintDescription, setComplaintDescription] = useState<string>("");
  const [complaintLoading, setComplaintLoading] = useState<boolean>(false);
  const [complaintSuccess, setComplaintSuccess] = useState<boolean>(false);

  // Worker Reviews History & Rated Workers states
  const [ratedWorkers, setRatedWorkers] = useState<string[]>([]);
  const [viewingWorkerReviews, setViewingWorkerReviews] = useState<any | null>(null);
  const [workerReviewsList, setWorkerReviewsList] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const fetchRatedWorkers = async () => {
    if (!appUser || appUser.role === "worker") return;
    try {
      const res = await api.get("/reviews/rated-workers");
      if (res.data && res.data.success) {
        setRatedWorkers(res.data.ratedWorkerIds);
      }
    } catch (err) {
      console.warn("Rated workers fetch failed/skipped:", err);
    }
  };

  const handleViewWorkerReviews = async (worker: any) => {
    setViewingWorkerReviews(worker);
    setReviewsLoading(true);
    setWorkerReviewsList([]);
    try {
      const res = await api.get(`/reviews/worker/${worker._id}`);
      if (res.data && res.data.success) {
        setWorkerReviewsList(res.data.reviews);
        if (res.data.rating) {
          setViewingWorkerReviews((prev: any) => {
            if (!prev) return null;
            return {
              ...prev,
              rating: res.data.rating,
              experience: res.data.experience ?? prev.experience,
              complaintsCount: res.data.complaintsCount ?? prev.complaintsCount
            };
          });
        }
      }
    } catch (err) {
      console.warn("Worker reviews fetch failed:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchWorkerComplaints = async () => {
    if (!appUser || appUser.role !== "worker") return;
    setComplaintsLoading(true);
    try {
      const res = await api.get("/complaints/worker-complaints");
      if (res.data && res.data.success) {
        setWorkerComplaints(res.data.complaints || []);
      }
    } catch (err) {
      console.error("Worker complaints fetch failed:", err);
    } finally {
      setComplaintsLoading(false);
    }
  };

  const fetchOwnReviews = async () => {
    if (!appUser || appUser.role !== "worker") return;
    setOwnReviewsLoading(true);
    try {
      const res = await api.get(`/reviews/worker/${appUser._id}`);
      if (res.data && res.data.success) {
        setOwnReviews(res.data.reviews || []);
      }
    } catch (err) {
      console.error("Failed to fetch worker reviews:", err);
    } finally {
      setOwnReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (appUser) {
      if (appUser.role === "worker") {
        fetchAvailableJobs();
        fetchActiveAssignments();
        fetchWorkerComplaints();
        fetchOwnReviews();
      } else {
        fetchRequests();
        fetchRatedWorkers();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser]);

  // Real-time Event-Driven Synchronization via WebSockets (Socket.io)
  useEffect(() => {
    if (!appUser) return;

    const getSocketURL = () => {
      if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
      }
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:3000`;
    };

    const socketUrl = getSocketURL();
    const socket = io(socketUrl, {
      transports: ["websocket"],
      autoConnect: true
    });

    console.log(`[Socket] Connecting to server at ${socketUrl} using transports: ['websocket']...`);

    socket.on("connect", () => {
      console.log(`[Socket] Connected with ID: ${socket.id}`);
    });

    if (appUser.role === "worker") {
      // Listen for newly created problems
      socket.on("newProblem", (problem) => {
        console.log("[Socket] Real-time Notification: New request raised!", problem);
        fetchAvailableJobs();
      });
      // Listen for updates on existing problems
      socket.on("problemUpdated", (data) => {
        console.log("[Socket] Real-time Notification: Problem updated!", data);
        fetchAvailableJobs();
        fetchActiveAssignments();
      });
      // Listen for complaint raised about this worker
      socket.on("complaintReceived", (data) => {
        console.log("[Socket] Real-time Notification: Complaint received!", data);
        if (data.worker_id === appUser._id) {
          setNewComplaintPopup(data.complaint);
          fetchWorkerComplaints();
        }
      });
    } else {
      // Listen for resolved problems
      socket.on("problemResolved", (data) => {
        console.log("[Socket] Real-time Notification: Request marked completed/resolved!", data);
        fetchRequests();
      });
      // Listen for updates on existing problems
      socket.on("problemUpdated", (data) => {
        console.log("[Socket] Real-time Notification: Problem updated!", data);
        fetchRequests();
      });
    }

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected from server.");
    });

    return () => {
      socket.disconnect();
    };
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
      const res = await api.post("/workers/accept-problem", {
        workerId: appUser._id,
        problemId
      });
      if (res.data.success) {
        await Promise.all([fetchAvailableJobs(), fetchActiveAssignments()]);
      }
    } catch (err: any) {
      await showAlert("Claim Job Error", err?.response?.data?.message || "Failed to claim the job.", "error");
    } finally {
      setClaimLoadingId(null);
    }
  };

  const handleStartProgress = async (problemId: string) => {
    setProgressLoadingId(problemId);
    try {
      const res = await api.patch(`/problem/start-progress/${problemId}`);
      if (res.status === 200) {
        await Promise.all([fetchAvailableJobs(), fetchActiveAssignments()]);
      }
    } catch (err: any) {
      await showAlert("Start Progress Error", err?.response?.data?.message || "Failed to start progress.", "error");
    } finally {
      setProgressLoadingId(null);
    }
  };

  const triggerResolveModal = (problemId: string) => {
    setCompletingProblemId(problemId);
    setPayoutInputText("");
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingProblemId) return;
    const amount = Number(payoutInputText) || 0;

    setCompletingLoading(true);
    try {
      const res = await api.patch(`/problem/ResolveProblem/${completingProblemId}`, {
        amountReceived: amount
      });
      if (res.status === 200) {
        setCompletingProblemId(null);
        setPayoutInputText("");
        await Promise.all([fetchAvailableJobs(), fetchActiveAssignments()]);
      }
    } catch (err: any) {
      await showAlert("Resolve Job Error", "Failed to resolve job.", "error");
    } finally {
      setCompletingLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser?._id || !reviewingProblem) return;
    const activeWorker = reviewingProblem.assigned_worker || reviewingProblem.resolved_worker;
    if (!activeWorker) return;
    
    setReviewLoading(true);
    try {
      const res = await api.post("/reviews/add", {
        userId: appUser._id,
        workerId: activeWorker._id,
        rating: ratingValue,
        review: reviewText
      });
      if (res.status === 201) {
        setReviewSuccess(true);
        setTimeout(() => {
          setReviewingProblem(null);
          setReviewText("");
          setRatingValue(5);
          setReviewSuccess(false);
          fetchRequests(); // Refresh requests list
          fetchRatedWorkers(); // Refresh rated workers
        }, 1500);
      }
    } catch (err: any) {
      await showAlert("Review Error", err?.response?.data?.message || "Failed to submit review.", "error");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser?._id || !complainingProblem) return;
    const activeWorker = complainingProblem.assigned_worker || complainingProblem.resolved_worker;
    if (!activeWorker) return;

    setComplaintLoading(true);
    try {
      const res = await api.post("/complaints/add", {
        problemId: complainingProblem._id,
        workerId: activeWorker._id,
        title: complaintTitle,
        description: complaintDescription
      });
      if (res.status === 201) {
        setComplaintSuccess(true);
        setTimeout(() => {
          setComplainingProblem(null);
          setComplaintTitle("");
          setComplaintDescription("");
          setComplaintSuccess(false);
        }, 1500);
      }
    } catch (err: any) {
      await showAlert("Complaint Error", err?.response?.data?.message || "Failed to submit complaint.", "error");
    } finally {
      setComplaintLoading(false);
    }
  };

  const handleDisputeComplaint = async (complaintId: string) => {
    const confirm = await showConfirm(
      "Report False Dispute",
      "Are you sure you want to report this complaint as false to the administrator? An admin will review it and verify with the client."
    );
    if (!confirm) return;

    try {
      const res = await api.put(`/complaints/dispute/${complaintId}`);
      if (res.data && res.data.success) {
        await showAlert("Dispute Registered", "Your dispute request has been submitted to the admin for review.", "success");
        fetchWorkerComplaints();
      }
    } catch (err: any) {
      await showAlert("Dispute Error", err?.response?.data?.message || "Failed to submit dispute.", "error");
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

  const getCategoryBadge = (cat?: string) => {
    if (!cat) return null;
    let emoji = "🛠️";
    let colorClass = "bg-slate-800 text-slate-300 border-slate-700/80";
    if (cat === "Plumber") {
      emoji = "🪠";
      colorClass = "bg-blue-500/10 border-blue-500/30 text-blue-400";
    } else if (cat === "Electrician") {
      emoji = "⚡";
      colorClass = "bg-amber-500/10 border-amber-500/30 text-amber-400";
    } else if (cat === "Mechanic") {
      emoji = "⚙️";
      colorClass = "bg-purple-500/10 border-purple-500/30 text-purple-400";
    } else if (cat === "Technician") {
      emoji = "🖥️";
      colorClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    }
    return (
      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border flex items-center gap-1 shrink-0 ${colorClass}`}>
        <span>{emoji}</span>
        <span>{cat}</span>
      </span>
    );
  };

  const getStatusBadge = (status: ProblemRequest["status"]) => {
    switch (status) {
      case "on the way":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-205 dark:border-indigo-900">
            <Truck size={12} />
            On the Way
          </span>
        );
      case "in progress":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 animate-pulse">
            <Clock size={12} />
            In Progress
          </span>
        );
      case "unresolved":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
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

  if (!appUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium tracking-wide">Syncing Session…</p>
        </div>
      </div>
    );
  }

  // ─── Service Partner Dashboard Panel ───
  if (appUser.role === "worker") {
    return (
      <div className="min-h-screen flex flex-col bg-transparent text-white font-sans transition-colors duration-300">
        <Navbar />

        <main className="flex-grow pt-28 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8">
          {/* Left Panel: Worker Profile and Stats Card */}
          <div className="w-full lg:w-1/3 shrink-0 flex flex-col gap-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
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
            <div className="glass-panel rounded-2xl p-1.5 flex shadow-xl relative z-10 select-none flex-nowrap overflow-hidden">
              <div 
                className="absolute top-1.5 bottom-1.5 bg-orange-600 rounded-xl transition-all duration-300"
                style={{
                  left: activeTab === "available" ? "6px" 
                        : activeTab === "active" ? "20%" 
                        : activeTab === "completed" ? "40%" 
                        : activeTab === "reviews" ? "60%" 
                        : "80%",
                  right: activeTab === "available" ? "80%" 
                         : activeTab === "active" ? "60%" 
                         : activeTab === "completed" ? "40%" 
                         : activeTab === "reviews" ? "20%" 
                         : "6px",
                }}
              />
              <button
                type="button"
                onClick={() => setActiveTab("available")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-[10px] sm:text-xs z-10 transition-colors duration-200 cursor-pointer ${
                  activeTab === "available" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Available Feed ({availableJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-[10px] sm:text-xs z-10 transition-colors duration-200 cursor-pointer ${
                  activeTab === "active" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Active ({activeAssignments.filter(a => a.status !== "resolved" && a.status !== "completed").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-[10px] sm:text-xs z-10 transition-colors duration-200 cursor-pointer ${
                  activeTab === "completed" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Completed ({activeAssignments.filter(a => a.status === "resolved" || a.status === "completed").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-[10px] sm:text-xs z-10 transition-colors duration-200 cursor-pointer ${
                  activeTab === "reviews" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Reviews ({ownReviews.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("complaints")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-[10px] sm:text-xs z-10 transition-colors duration-200 cursor-pointer ${
                  activeTab === "complaints" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Complaints ({workerComplaints.length})
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
                  <div className="glass-panel rounded-3xl p-12 text-center shadow-xl max-w-xl mx-auto flex flex-col items-center">
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
                        className="group glass-panel rounded-3xl hover:border-orange-500/40 transition-all duration-300 p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-orange-500/[0.02] hover:-translate-y-0.5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-base text-white line-clamp-1">{job.name}</h4>
                                {getCategoryBadge(job.category)}
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
 
                           {/* Media Grid Carousel */}
                           {((job.pictures && job.pictures.length > 0) || (job.videos && job.videos.length > 0) || job.picture || job.video) && (
                             <div className="space-y-1.5 mb-4">
                               <span className="text-[9px] uppercase font-bold text-slate-500">Diagnostics Attached</span>
                               <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                                 {job.pictures && job.pictures.length > 0 ? (
                                   job.pictures.map((picUrl, idx) => (
                                     <a
                                       key={`pic-${idx}`}
                                       href={picUrl}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-800 hover:border-orange-500/50 transition-all shadow-md group block"
                                     >
                                       <img src={picUrl} alt={`Diagnostic ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                     </a>
                                   ))
                                 ) : job.picture ? (
                                   <a
                                     href={job.picture}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-800 hover:border-orange-500/50 transition-all shadow-md group block"
                                   >
                                     <img src={job.picture} alt="Diagnostic Picture" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                   </a>
                                 ) : null}

                                 {job.videos && job.videos.length > 0 ? (
                                   job.videos.map((vidUrl, idx) => (
                                     <a
                                       key={`vid-${idx}`}
                                       href={vidUrl}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="relative w-14 h-14 rounded-lg bg-indigo-950/40 border border-indigo-900 hover:border-orange-500/50 transition-all shadow-md flex flex-col items-center justify-center shrink-0 group text-center"
                                     >
                                       <Video size={14} className="text-indigo-400 group-hover:scale-105 transition-transform" />
                                       <span className="text-[6px] text-slate-405 font-bold uppercase mt-0.5">Clip {idx + 1}</span>
                                     </a>
                                   ))
                                 ) : job.video ? (
                                   <a
                                     href={job.video}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="relative w-14 h-14 rounded-lg bg-indigo-950/40 border border-indigo-900 hover:border-orange-500/50 transition-all shadow-md flex flex-col items-center justify-center shrink-0 group text-center"
                                   >
                                     <Video size={14} className="text-indigo-400 group-hover:scale-105 transition-transform" />
                                     <span className="text-[6px] text-slate-405 font-bold uppercase mt-0.5">Clip</span>
                                   </a>
                                 ) : null}
                               </div>
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
            ) : activeTab === "active" ? (
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
                ) : (() => {
                  const activeJobsList = activeAssignments.filter(a => a.status !== "resolved" && a.status !== "completed");
                  if (activeJobsList.length === 0) {
                    return (
                      /* Elegant Empty State */
                      <div className="glass-panel rounded-3xl p-12 text-center shadow-xl max-w-xl mx-auto flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-5">
                          <Wrench className="w-7 h-7 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5">No Active Assignments</h3>
                        <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-6">
                          You are not currently tracking any active claimed requests. Claim a request from the Dispatch feed to start repairing immediately.
                        </p>
                        <button
                          onClick={() => setActiveTab("available")}
                          className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          View Available Dispatches
                        </button>
                      </div>
                    );
                  }
                  return (
                    /* Cards Feed */
                    <div className="grid grid-cols-1 gap-6">
                      {activeJobsList.map((assignment) => (
                      <div 
                        key={assignment._id}
                        className={`glass-panel rounded-3xl transition-all duration-300 p-6 flex flex-col sm:flex-row justify-between gap-6 hover:shadow-xl hover:-translate-y-0.5 ${
                          assignment.urgency ? "border-red-500/20" : ""
                        }`}
                      >
                        <div className="flex-grow space-y-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-lg text-white line-clamp-1">{assignment.name}</h4>
                              {getCategoryBadge(assignment.category)}
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

                          <p className="text-slate-300 text-xs leading-relaxed max-w-xl">{assignment.description}</p>

                          {assignment.address && (
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400 bg-slate-950/40 rounded-2xl p-4 border border-slate-850">
                              <div className="flex items-start gap-2 max-w-xl">
                                <MapPin size={13} className="text-orange-500 mt-0.5 shrink-0" />
                                <span>
                                  <strong>Exact Address:</strong> {assignment.address.address}, {assignment.address.area}, {assignment.address.city}, {assignment.address.district}, {assignment.address.state} - {assignment.address.pin_code}
                                </span>
                              </div>
                              {assignment.status !== "resolved" && assignment.userId?.phone && (
                                <a
                                  href={`tel:${assignment.userId.phone}`}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 no-underline cursor-pointer"
                                  title={`Call Customer: ${assignment.userId.name}`}
                                >
                                  <Phone size={13} className="animate-bounce" />
                                  Call Customer
                                </a>
                              )}
                            </div>
                          )}

                          {/* Media Grid Carousel */}
                          {((assignment.pictures && assignment.pictures.length > 0) || (assignment.videos && assignment.videos.length > 0) || assignment.picture || assignment.video) && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] uppercase font-bold text-slate-500">Diagnostics Attached</span>
                              <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                                {assignment.pictures && assignment.pictures.length > 0 ? (
                                  assignment.pictures.map((picUrl, idx) => (
                                    <a
                                      key={`pic-${idx}`}
                                      href={picUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-800 hover:border-orange-500/50 transition-all shadow-md group block"
                                    >
                                      <img src={picUrl} alt={`Diagnostic ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    </a>
                                  ))
                                ) : assignment.picture ? (
                                  <a
                                    href={assignment.picture}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-800 hover:border-orange-500/50 transition-all shadow-md group block"
                                  >
                                    <img src={assignment.picture} alt="Diagnostic Picture" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  </a>
                                ) : null}

                                {assignment.videos && assignment.videos.length > 0 ? (
                                  assignment.videos.map((vidUrl, idx) => (
                                    <a
                                      key={`vid-${idx}`}
                                      href={vidUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="relative w-14 h-14 rounded-lg bg-indigo-950/40 border border-indigo-900 hover:border-orange-500/50 transition-all shadow-md flex flex-col items-center justify-center shrink-0 group text-center"
                                    >
                                      <Video size={14} className="text-indigo-400 group-hover:scale-105 transition-transform" />
                                      <span className="text-[6px] text-slate-405 font-bold uppercase mt-0.5">Clip {idx + 1}</span>
                                    </a>
                                  ))
                                ) : assignment.video ? (
                                  <a
                                    href={assignment.video}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative w-14 h-14 rounded-lg bg-indigo-950/40 border border-indigo-900 hover:border-orange-500/50 transition-all shadow-md flex flex-col items-center justify-center shrink-0 group text-center"
                                  >
                                    <Video size={14} className="text-indigo-400 group-hover:scale-105 transition-transform" />
                                    <span className="text-[6px] text-slate-405 font-bold uppercase mt-0.5">Clip</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Control Actions Panel */}
                        <div className="shrink-0 flex flex-col gap-3 justify-center w-full sm:w-48">
                          {assignment.status === "on the way" ? (
                            <button
                              onClick={() => handleStartProgress(assignment._id)}
                              disabled={progressLoadingId === assignment._id}
                              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs transition-all active:scale-[0.98] shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                            >
                              {progressLoadingId === assignment._id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Truck size={14} />
                                  Arrived & Start
                                </>
                              )}
                            </button>
                          ) : assignment.status === "in progress" ? (
                            <button
                              onClick={() => triggerResolveModal(assignment._id)}
                              disabled={completingProblemId === assignment._id}
                              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                            >
                              {completingProblemId === assignment._id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Check size={14} />
                                  Mark Resolved
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="flex flex-col gap-1 text-center py-2 px-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                              <div className="flex items-center justify-center gap-1">
                                <CheckCircle2 size={14} />
                                Completed
                              </div>
                              {assignment.amountReceived !== undefined && assignment.amountReceived > 0 && (
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  Earnings: ₹{assignment.amountReceived}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              </div>
            ) : activeTab === "completed" ? (
              // Completed Repair Assignments Center
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                    Completed Repair Archive
                  </h3>
                  <button 
                    onClick={fetchActiveAssignments} 
                    className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-all hover:underline"
                  >
                    Refresh Archive
                  </button>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 size={36} className="animate-spin text-orange-500 mb-4" />
                    <p className="text-slate-400 text-xs font-semibold">Loading archive…</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-950/20 border border-red-900 rounded-3xl p-8 text-center text-red-400 max-w-lg mx-auto">
                    <AlertCircle size={36} className="mx-auto mb-3" />
                    <h3 className="font-bold text-base mb-1">Retrieval Failed</h3>
                    <p className="text-xs">{error}</p>
                  </div>
                ) : (() => {
                  const completedJobsList = activeAssignments.filter(a => a.status === "resolved" || a.status === "completed");
                  if (completedJobsList.length === 0) {
                    return (
                      <div className="glass-panel rounded-3xl p-12 text-center shadow-xl max-w-xl mx-auto flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-5">
                          <CheckCircle2 className="w-7 h-7 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5">No Completed Jobs</h3>
                        <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                          You have not resolved any repair requests yet. Complete active jobs from your track list to start building your record!
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 gap-6">
                      {completedJobsList.map((assignment) => (
                        <div 
                          key={assignment._id}
                          className="glass-panel rounded-3xl transition-all duration-300 p-6 flex flex-col sm:flex-row justify-between gap-6 hover:shadow-xl hover:-translate-y-0.5"
                        >
                          <div className="flex-grow space-y-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-lg text-white line-clamp-1">{assignment.name}</h4>
                                {getCategoryBadge(assignment.category)}
                                {getStatusBadge(assignment.status)}
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                                {assignment.description}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-350">
                                <MapPin size={15} className="text-orange-500" />
                                <span>{assignment.address?.addressLine || "Address not provided"}</span>
                              </div>
                              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-350">
                                <Calendar size={15} className="text-orange-500" />
                                <span>Completed on: {new Date(assignment.updatedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col justify-center w-full sm:w-48">
                            <div className="flex flex-col gap-1 text-center py-3 px-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                              <div className="flex items-center justify-center gap-1">
                                <CheckCircle2 size={14} />
                                Completed
                              </div>
                              {assignment.amountReceived !== undefined && assignment.amountReceived > 0 && (
                                <span className="text-[10px] text-slate-350 mt-0.5 font-extrabold block">
                                  Payout: ₹{assignment.amountReceived}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "reviews" ? (
              // Received Reviews Center
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Star className="text-amber-500 fill-amber-500 animate-pulse" size={20} />
                    Client Rating & Reviews History
                  </h3>
                  <button 
                    onClick={fetchOwnReviews} 
                    className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-all hover:underline"
                  >
                    Refresh Reviews
                  </button>
                </div>

                {ownReviewsLoading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 size={36} className="animate-spin text-orange-500 mb-4" />
                    <p className="text-slate-400 text-xs font-semibold">Loading reviews…</p>
                  </div>
                ) : ownReviews.length === 0 ? (
                  <div className="glass-panel rounded-3xl p-12 text-center shadow-xl max-w-xl mx-auto flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-5">
                      <Star className="w-7 h-7 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1.5">No Reviews Yet</h3>
                    <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                      You haven't received any client ratings or reviews yet. Complete your repair requests and ask customers to rate your work!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {ownReviews.map((rev) => (
                      <div 
                        key={rev._id} 
                        className="glass-panel rounded-3xl p-5 border border-slate-800/40 hover:border-slate-800 transition-all hover:shadow-lg space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white uppercase border border-slate-700">
                              {rev.user_id?.photo ? (
                                <img src={rev.user_id.photo} alt={rev.user_id.name} className="w-full h-full object-cover" />
                              ) : (
                                rev.user_id?.name?.[0]?.toUpperCase() || "C"
                              )}
                            </div>
                            <span className="text-[11px] font-extrabold text-slate-200">{rev.user_id?.name || "Customer"}</span>
                          </div>
                          <span className="text-[10px] text-slate-550 font-semibold">
                            {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : "Just now"}
                          </span>
                        </div>
                        
                        {/* Rating Stars */}
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={i < rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-700"}
                            />
                          ))}
                        </div>

                        <p className="text-xs text-slate-350 leading-relaxed font-semibold italic">
                          "{rev.discription}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Worker Complaints Log Section */
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <ShieldAlert className="text-red-500 animate-pulse" size={20} />
                    Verified Safety & Feedback Complaints
                  </h3>
                  <button 
                    onClick={fetchWorkerComplaints} 
                    className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-all hover:underline"
                  >
                    Refresh Complaints
                  </button>
                </div>

                {complaintsLoading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 size={36} className="animate-spin text-orange-500 mb-4" />
                    <p className="text-slate-400 text-xs font-semibold">Loading safety logs…</p>
                  </div>
                ) : workerComplaints.length === 0 ? (
                  <div className="glass-panel rounded-3xl p-12 text-center shadow-xl max-w-xl mx-auto flex flex-col items-center animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-5 animate-bounce-slow">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1.5">No Safety Complaints</h3>
                    <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                      Your profile has clean safety reports. Keep up the good work and maintain professional, reliable service for your customers!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {workerComplaints.map((complaint) => (
                      <div 
                        key={complaint._id}
                        className="glass-panel rounded-3xl p-5 border border-red-500/10 hover:border-red-500/20 transition-all hover:shadow-lg flex flex-col gap-3 animate-fade-in"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                            <h4 className="font-bold text-sm text-slate-200">{complaint.title}</h4>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {new Date(complaint.createdAt).toLocaleDateString()} at {new Date(complaint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          {complaint.description}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 bg-slate-950/40 px-3.5 py-2.5 rounded-xl border border-slate-900/60 flex-grow">
                            <span className="flex items-center gap-1 font-bold text-rose-500/80">
                              <ShieldAlert size={12} />
                              Reported By:
                            </span>
                            <span className="font-bold text-slate-400 tracking-wide">Verified Client</span>
                          </div>

                          {complaint.status === "disputed" ? (
                            <div className="flex items-center justify-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider h-full shrink-0 select-none animate-pulse">
                              <AlertCircle size={12} />
                              Dispute Pending Admin Review
                            </div>
                          ) : complaint.status === "revoked" ? (
                            <div className="flex items-center justify-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider h-full shrink-0 select-none">
                              <ShieldAlert size={12} />
                              Dispute Rejected by Admin
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDisputeComplaint(complaint._id)}
                              className="bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 hover:border-red-900 text-red-400 font-bold px-4 py-2 rounded-xl text-[10px] transition-all cursor-pointer shrink-0 active:scale-95 text-center"
                            >
                              Report False (Dispute)
                            </button>
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

        {/* Worker Payout Modal */}
        {completingProblemId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden animate-scale-up">
              {/* Glow decoration */}
              <div className="absolute -right-16 -top-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={22} />
                Complete Repair Job
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
                Please enter the final payment amount received directly from the customer. This establishes instant billing transparency.
              </p>

              <form onSubmit={handleResolveSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Amount Received (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={payoutInputText}
                      onChange={(e) => setPayoutInputText(e.target.value)}
                      placeholder="Enter amount (e.g. 500)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-4 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-700 transition-all"
                      required
                      min="0"
                    />
                  </div>
                </div>

                {/* Zero Platform Fee Tag */}
                <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-4 text-xs leading-relaxed text-emerald-400 flex items-start gap-2.5">
                  <ShieldCheck size={18} className="shrink-0" />
                  <div>
                    <strong className="block font-bold">100% Direct Payout</strong>
                    Rapid-Fix charges ₹0 platform fees. The complete amount entered goes directly to you.
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCompletingProblemId(null);
                      setPayoutInputText("");
                    }}
                    className="w-1/2 py-3.5 rounded-2xl border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs tracking-wide transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={completingLoading}
                    className="w-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl text-xs tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {completingLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Submit & Close"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Customer Dashboard Panel ───
  if (appUser.role === "user" || appUser.role === "admin") {
    return (
      <div className="min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main className="flex-grow pt-28 pb-16 px-6 md:px-16 max-w-7xl mx-auto w-full">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden glass-panel rounded-3xl p-6 sm:p-8 mb-8 text-white shadow-xl shadow-blue-900/10">
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
            <div className="glass-panel rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto flex flex-col items-center">
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
                  className="glass-panel rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between hover:-translate-y-0.5"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">
                            {req.name}
                          </h3>
                          {getCategoryBadge(req.category)}
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
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4 line-clamp-2">
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

                    {/* Media Grid Carousel */}
                    {((req.pictures && req.pictures.length > 0) || (req.videos && req.videos.length > 0) || req.picture || req.video) && (
                      <div className="space-y-1.5 mb-4">
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Diagnostics Attached</span>
                        <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                          {req.pictures && req.pictures.length > 0 ? (
                            req.pictures.map((picUrl, idx) => (
                              <a
                                key={`pic-${idx}`}
                                href={picUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-orange-500/50 transition-all shadow-md group block"
                              >
                                <img src={picUrl} alt={`Diagnostic ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              </a>
                            ))
                          ) : req.picture ? (
                            <a
                              href={req.picture}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-orange-500/50 transition-all shadow-md group block"
                            >
                              <img src={req.picture} alt="Diagnostic Picture" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            </a>
                          ) : null}

                          {req.videos && req.videos.length > 0 ? (
                            req.videos.map((vidUrl, idx) => (
                              <a
                                key={`vid-${idx}`}
                                href={vidUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative w-14 h-14 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-slate-200 dark:border-indigo-900 hover:border-blue-500/50 dark:hover:border-orange-500/50 transition-all shadow-md flex flex-col items-center justify-center shrink-0 group text-center"
                              >
                                <Video size={14} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform" />
                                <span className="text-[6px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5">Clip {idx + 1}</span>
                              </a>
                            ))
                          ) : req.video ? (
                            <a
                              href={req.video}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative w-14 h-14 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-slate-200 dark:border-indigo-900 hover:border-blue-500/50 dark:hover:border-orange-500/50 transition-all shadow-md flex flex-col items-center justify-center shrink-0 group text-center"
                            >
                              <Video size={14} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform" />
                              <span className="text-[6px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5">Clip</span>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned/Resolved worker footer info */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    {req.assigned_worker || req.resolved_worker ? (
                      (() => {
                        const activeWorker = req.assigned_worker || req.resolved_worker;
                        if (!activeWorker || typeof activeWorker !== "object" || !activeWorker.name) return null;
                        return (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="relative w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 mt-0.5">
                                  {activeWorker.photo ? (
                                    <img src={activeWorker.photo} alt={activeWorker.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-orange-500 font-bold bg-slate-950 text-sm">
                                      {activeWorker.name[0].toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wide">
                                    {req.status === "resolved" ? "Serviced by Expert" : "Technician Assigned"}
                                  </p>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{activeWorker.name}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{activeWorker.experience || 0} Years In-field Experience</p>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    {renderStars(activeWorker.rating?.totalSum, activeWorker.rating?.totalCount)}
                                    <button
                                      type="button"
                                      onClick={() => handleViewWorkerReviews(activeWorker)}
                                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors mt-0.5 text-left border-none bg-transparent outline-none p-0 cursor-pointer hover:underline"
                                    >
                                      View Rating & Review History →
                                    </button>
                                    {activeWorker.complaintsCount !== undefined && (
                                      <p className="text-[9px] font-bold mt-1 text-slate-500 dark:text-slate-400">
                                        Complaints:{" "}
                                        <span className={activeWorker.complaintsCount > 0 ? "text-red-500 font-extrabold" : "text-emerald-500 font-extrabold"}>
                                          {activeWorker.complaintsCount} raised
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {req.status !== "resolved" && (
                                <div className="flex gap-2 shrink-0">
                                  <a
                                    href={`tel:${activeWorker.phone}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-orange-400 rounded-xl text-[10px] font-bold no-underline transition-colors shrink-0"
                                  >
                                    <Phone size={11} />
                                    Call Expert
                                    {activeWorker.isPhoneVerified && (
                                      <CheckCircle2 size={10} className="text-emerald-500 fill-emerald-500/10" />
                                    )}
                                  </a>
                                  <button
                                    onClick={() => setComplainingProblem(req)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-bold transition-colors shrink-0 cursor-pointer"
                                  >
                                    Report
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {req.status === "resolved" && (
                                <div className="space-y-3">
                                  {/* Billing transparency */}
                                  <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-900/30 rounded-2xl p-4 text-[11px] space-y-2">
                                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Total Amount Paid:</span>
                                      <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">₹{req.amountReceived || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-emerald-500 dark:text-emerald-400 border-t border-slate-200 dark:border-slate-800/80 pt-2 font-medium">
                                      <span className="flex items-center gap-1">
                                        <ShieldCheck size={12} />
                                        Platform Fees: ₹0
                                      </span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">100% direct to specialist</span>
                                    </div>
                                  </div>

                                  {ratedWorkers.includes(activeWorker._id) ? (
                                    <div className="flex gap-2 w-full">
                                      <div className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-1.5 select-none uppercase tracking-wider">
                                        <ShieldCheck size={12} />
                                        ✓ Service Partner Rated & Reviewed
                                      </div>
                                      <button
                                        onClick={() => setComplainingProblem(req)}
                                        className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                      >
                                        Report
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2 w-full">
                                      <button
                                        onClick={() => setReviewingProblem(req)}
                                        className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10 cursor-pointer"
                                      >
                                        <Star size={11} className="fill-white" />
                                        Rate & Review Expert
                                      </button>
                                      <button
                                        onClick={() => setComplainingProblem(req)}
                                        className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                      >
                                        Report
                                      </button>
                                    </div>
                                  )}
                                </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-[11px] italic font-medium">Finding the perfect professional for your location…</span>
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

      {/* Rate & Review Modal */}
      {reviewingProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-scale-up">
            {/* Close Button */}
            <button
              onClick={() => {
                setReviewingProblem(null);
                setReviewText("");
                setRatingValue(5);
                setReviewSuccess(false);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Rate & Review Expert</h3>
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              Share your experience with <strong>{(reviewingProblem.assigned_worker || reviewingProblem.resolved_worker)?.name}</strong> for the job: "{reviewingProblem.name}"
            </p>

            {reviewSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400 animate-bounce">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Feedback Submitted!</h4>
                <p className="text-xs text-slate-400">Thank you for rating our service partner.</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-6">
                {/* Star selector */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Rating</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingValue(star)}
                        className="p-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Star
                          size={32}
                          className={
                            star <= ratingValue
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-700 hover:text-amber-400/50"
                          }
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-400 mt-1">
                    {ratingValue === 5 ? "Excellent 🌟" : ratingValue === 4 ? "Very Good 👍" : ratingValue === 3 ? "Good 👌" : ratingValue === 2 ? "Fair 😕" : "Poor 👎"}
                  </span>
                </div>

                {/* Review text */}
                <div className="space-y-1.5">
                  <label htmlFor="reviewText" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Write a Review</label>
                  <textarea
                    id="reviewText"
                    rows={4}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write a brief review about the expert's punctuality, work quality, and professionalism..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-slate-600 resize-none transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3.5 rounded-2xl text-xs sm:text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {reviewLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Submit Feedback"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* File Complaint Modal */}
      {complainingProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-scale-up">
            {/* Close Button */}
            <button
              onClick={() => {
                setComplainingProblem(null);
                setComplaintTitle("");
                setComplaintDescription("");
                setComplaintSuccess(false);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer outline-none"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="text-red-500 animate-pulse" size={22} />
              File Complaint
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              Report an issue with <strong>{(complainingProblem.assigned_worker || complainingProblem.resolved_worker)?.name}</strong> for the job: "{complainingProblem.name}"
            </p>

            {complaintSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400 animate-bounce">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Complaint Submitted</h4>
                <p className="text-xs text-slate-400">Your report has been logged and sent to administration.</p>
              </div>
            ) : (
              <form onSubmit={handleComplaintSubmit} className="space-y-6">
                {/* Complaint Title */}
                <div className="space-y-1.5">
                  <label htmlFor="complaintTitle" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Complaint Reason</label>
                  <input
                    type="text"
                    id="complaintTitle"
                    value={complaintTitle}
                    onChange={(e) => setComplaintTitle(e.target.value)}
                    placeholder="e.g. Arrived late, unprofessional behaviour, incorrect pricing..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-slate-600 transition-all"
                    required
                  />
                </div>

                {/* Complaint Description */}
                <div className="space-y-1.5">
                  <label htmlFor="complaintDesc" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Detailed Details</label>
                  <textarea
                    id="complaintDesc"
                    rows={4}
                    value={complaintDescription}
                    onChange={(e) => setComplaintDescription(e.target.value)}
                    placeholder="Provide a detailed explanation of what went wrong, including any relevant details..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-slate-600 resize-none transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={complaintLoading}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3.5 rounded-2xl text-xs sm:text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-red-500/10 hover:shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {complaintLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Worker Payout Modal */}
      {false && completingProblemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden animate-scale-up">
            {/* Glow decoration */}
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={22} />
              Complete Repair Job
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              Please enter the final payment amount received directly from the customer. This establishes instant billing transparency.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Amount Received (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={payoutInputText}
                    onChange={(e) => setPayoutInputText(e.target.value)}
                    placeholder="Enter amount (e.g. 500)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-4 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-700 transition-all"
                    required
                    min="0"
                  />
                </div>
              </div>

              {/* Zero Platform Fee Tag */}
              <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-4 text-xs leading-relaxed text-emerald-400 flex items-start gap-2.5">
                <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">100% Direct Payout</strong>
                  Rapid-Fix charges ₹0 platform fees. The complete amount entered goes directly to you.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCompletingProblemId(null);
                    setPayoutInputText("");
                  }}
                  className="w-1/2 py-3.5 rounded-2xl border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs tracking-wide transition-all active:scale-[0.98] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completingLoading}
                  className="w-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl text-xs tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {completingLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Submit & Close"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker Reviews History Modal */}
      {viewingWorkerReviews && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setViewingWorkerReviews(null)} />
          <div className="relative w-full max-w-md glass-panel rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-white">Rating & Review History</h3>
                <p className="text-[11px] text-slate-400 mt-1">Specialist: <span className="text-orange-400 font-bold">{viewingWorkerReviews.name}</span></p>
              </div>
              <button
                onClick={() => setViewingWorkerReviews(null)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-4">
              <div className="flex items-center gap-4 bg-slate-950/30 p-3 rounded-2xl border border-slate-850 mb-2">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Overall Rating</h4>
                  <div className="mt-1.5">
                    {renderStars(viewingWorkerReviews.rating?.totalSum, viewingWorkerReviews.rating?.totalCount)}
                  </div>
                </div>
                <div className="border-l border-slate-800 pl-4 py-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Experience</h4>
                  <p className="text-xs font-bold text-white mt-1">{viewingWorkerReviews.experience || 0} Years In-field</p>
                </div>
                {viewingWorkerReviews.complaintsCount !== undefined && (
                  <div className="border-l border-slate-800 pl-4 py-1">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Complaints</h4>
                    <p className={`text-xs font-black mt-1 ${viewingWorkerReviews.complaintsCount > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {viewingWorkerReviews.complaintsCount} Raised
                    </p>
                  </div>
                )}
              </div>

              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800/60 pb-1.5">Customer Reviews</h4>
              
              {reviewsLoading ? (
                <div className="py-8 flex justify-center items-center">
                  <Loader2 className="animate-spin text-orange-500" size={24} />
                </div>
              ) : workerReviewsList.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500 font-medium">No reviews written for this specialist yet.</p>
                </div>
              ) : (
                workerReviewsList.map((rev) => (
                  <div key={rev._id} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white uppercase border border-slate-700">
                          {rev.user_id?.photo ? (
                            <img src={rev.user_id.photo} alt={rev.user_id.name} className="w-full h-full object-cover" />
                          ) : (
                            rev.user_id?.name?.[0]?.toUpperCase() || "C"
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-200">{rev.user_id?.name || "Customer"}</span>
                      </div>
                      <span className="text-[10px] text-slate-550 font-semibold">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : "Just now"}
                      </span>
                    </div>
                    
                    {/* Stars */}
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          className={i < rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-700"}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-medium italic">
                      "{rev.discription}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Worker Complaint Notification Modal */}
      {newComplaintPopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop overlay WITHOUT click handler to prevent accidental dismissals */}
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
          
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden animate-scale-up z-10 text-center flex flex-col items-center">
            
            {/* Pulsing warning indicator */}
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mb-4 animate-pulse">
              <ShieldAlert size={32} />
            </div>

            <h3 className="text-lg font-black text-white tracking-wide uppercase text-red-500">
              Complaint Received
            </h3>
            
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1 mb-4">
              Verified Client Report
            </p>

            <div className="w-full bg-slate-950/60 border border-slate-850 rounded-2xl p-4 text-left mb-5 space-y-2">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                {newComplaintPopup.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {newComplaintPopup.description}
              </p>
              <div className="text-[9px] text-slate-650 font-semibold border-t border-slate-900 pt-1.5 flex justify-between items-center">
                <span>Reporter:</span>
                <span className="text-slate-400 font-bold">Verified Client</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-6 leading-relaxed max-w-xs">
              Please review this complaint in your profile. Maintain a safe, helpful, and highly professional community standard.
            </p>

            <button
              onClick={() => setNewComplaintPopup(null)}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all hover:shadow-lg shadow-red-500/20 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            >
              Understood & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback redirect screen
return <Navigate to="/login" replace />;
}
