import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePopup } from "../context/PopupContext";
import api from "../service/api";
import ProblemModal from "./Problem";
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Loader2,
  CheckCircle,
  Wrench,
  ShieldAlert,
  Share2,
  Lock,
  Maximize2,
  Minimize2,
  Trash2
} from "lucide-react";

interface AIResponse {
  classification: "solvable" | "community" | "professional";
  aiExplanation: string;
  diySteps?: {
    title: string;
    steps: string[];
    safetyPrecautions: string[];
  };
  communityDraft?: {
    title: string;
    content: string;
    tags: string[];
  };
  serviceRequestDraft?: {
    name: string;
    description: string;
    category: string;
    urgency: boolean;
  };
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  diagnosis?: AIResponse;
  timestamp: Date;
}

export default function AIAssistantWidget() {
  const { isAuthenticated, appUser } = useAuth();
  const { showConfirm } = usePopup();
  const navigate = useNavigate();

  // Hide the AI Assistant widget for service partners (workers)
  if (appUser?.role === "worker") {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Persistent messages state
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("rf_ai_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        console.error("Failed to parse saved AI messages:", e);
      }
    }
    return [
      {
        id: "welcome",
        sender: "ai",
        text: "Hi! I am your Rapid-Fix Smart AI Assistant. Tell me what problem you are facing (e.g. 'faucet leaking' or 'sparking outlets'), and I'll analyze it, give you DIY troubleshooting guides, or draft service dispatches!",
        timestamp: new Date()
      }
    ];
  });

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync messages to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("rf_ai_messages", JSON.stringify(messages));
  }, [messages]);

  // Prefill states for raising a request
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [prefillDescription, setPrefillDescription] = useState("");
  const [prefillCategory, setPrefillCategory] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleClearChat = async () => {
    const confirmClear = await showConfirm(
      "Clear Chat History",
      "Are you sure you want to clear your AI assistant chat history?"
    );
    if (!confirmClear) return;
    
    const welcomeMsg: Message = {
      id: "welcome",
      sender: "ai",
      text: "Hi! I am your Rapid-Fix Smart AI Assistant. Tell me what problem you are facing (e.g. 'faucet leaking' or 'sparking outlets'), and I'll analyze it, give you DIY troubleshooting guides, or draft service dispatches!",
      timestamp: new Date()
    };
    setMessages([welcomeMsg]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText;
    setInputText("");

    // 1. Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // 2. Fetch diagnosis from backend
      const res = await api.post("/ai/diagnose", { message: userText });
      if (res.data && res.data.success) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: res.data.diagnosis.aiExplanation,
          diagnosis: res.data.diagnosis,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to connect to AI engine.";
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `Sorry, I encountered an error: ${errMsg}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Action: Prefill Community Post and navigate
  const handlePostToCommunity = (draft: AIResponse["communityDraft"]) => {
    if (!draft) return;
    localStorage.setItem("rf_community_draft", JSON.stringify(draft));
    setIsOpen(false);
    navigate("/community");
  };

  // Action: Launch Prefilled Service Dispatch Modal
  const handleLaunchDispatchModal = (draft: AIResponse["serviceRequestDraft"]) => {
    if (!draft) return;
    setPrefillName(draft.name);
    setPrefillDescription(draft.description);
    setPrefillCategory(draft.category);
    setIsProblemModalOpen(true);
  };

  return (
    <>
      {/* ── FLOATING BUTTON (Bottom Right) ── */}
      <div className="fixed bottom-6 right-6 z-[90] animate-bounce-slow">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-orange-500 dark:to-amber-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          aria-label="Ask AI Assistant"
        >
          {isOpen ? <X size={22} /> : <Sparkles className="animate-pulse" size={22} />}
        </button>
      </div>

      {/* ── CHAT PANEL ── */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 z-[90] glass-panel rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up bg-white/95 dark:bg-slate-950/95 transition-all duration-300 ${
          isExpanded 
            ? "w-[96vw] sm:w-[750px] h-[80vh] max-h-[750px]" 
            : "w-[92vw] sm:w-[400px] h-[550px]"
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 p-4 flex items-center justify-between text-white border-b border-slate-900/60 shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wide uppercase">Rapid-Fix Diagnostic AI</h3>
                <span className="text-[9px] text-orange-400 font-bold tracking-wide">GEMINI 2.5 FLASH ACTIVE</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 1 && (
                <button
                  onClick={handleClearChat}
                  title="Clear Chat History"
                  className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer p-1 rounded hover:bg-white/10"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                onClick={() => setIsExpanded(prev => !prev)}
                title={isExpanded ? "Minimize Chat" : "Expand Chat"}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-white/10"
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* AI Accuracy Warning Banner */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-amber-500 dark:text-amber-400 text-[10px] font-extrabold select-none shrink-0">
            <ShieldAlert size={12} className="shrink-0 animate-pulse" />
            <span>AI can make mistakes, so don't blindly trust it. Prioritize safety!</span>
          </div>

          {/* Chat Body & Messages View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/30 scrollbar-thin">
            {!isAuthenticated ? (
              /* ── Lock Screen Guard ── */
              <div className="flex flex-col items-center justify-center text-center h-full space-y-5 px-4 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  <Lock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Sign In Required</h4>
                  <p className="text-[11px] text-slate-400 mt-2 max-w-[240px] leading-relaxed">
                    Access our dynamic diagnostic trade AI to analyze, guide, or dispatch technicians to your coordinates.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/login");
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/10 cursor-pointer active:scale-95 transition-all"
                >
                  Authenticate & Sign In
                </button>
              </div>
            ) : (
              /* ── Conversational Messages List ── */
              <>
                {messages.map(msg => (
                  <div key={msg.id} className="space-y-3">
                    {/* Message Bubble */}
                    <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start animate-fade-in"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-blue-900 dark:bg-orange-600 text-white font-medium rounded-tr-none"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none"
                      }`}>
                        {msg.text}
                      </div>
                    </div>

                    {/* Diagnostic Actions rendering card */}
                    {msg.sender === "ai" && msg.diagnosis && (
                      <div className="animate-slide-up border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-md">
                        {/* solvable DIY guide card */}
                        {msg.diagnosis.classification === "solvable" && msg.diagnosis.diySteps && (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <CheckCircle className="text-emerald-500" size={15} />
                              <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                                DIY Guide: {msg.diagnosis.diySteps.title}
                              </span>
                            </div>
                            
                            {/* Precautions warnings */}
                            {msg.diagnosis.diySteps.safetyPrecautions?.length > 0 && (
                              <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-500 font-bold space-y-1">
                                <span className="uppercase tracking-wider block text-[9px] font-black">Safety Precautions:</span>
                                <ul className="list-disc pl-3 space-y-0.5">
                                  {msg.diagnosis.diySteps.safetyPrecautions.map((pre, idx) => (
                                    <li key={idx}>{pre}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Steps list */}
                            <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 pl-1">
                              {msg.diagnosis.diySteps.steps.map((step, idx) => (
                                <li key={idx} className="flex gap-2 items-start">
                                  <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* community forum poster card */}
                        {msg.diagnosis.classification === "community" && msg.diagnosis.communityDraft && (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <MessageSquare className="text-blue-500" size={15} />
                              <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                                Drafted Community Question
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                              <h5 className="text-[11px] font-bold text-slate-800 dark:text-white">
                                {msg.diagnosis.communityDraft.title}
                              </h5>
                              <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">
                                {msg.diagnosis.communityDraft.content}
                              </p>
                            </div>
                            <button
                              onClick={() => handlePostToCommunity(msg.diagnosis?.communityDraft)}
                              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                            >
                              <Share2 size={13} />
                              Publish to Community Forum
                            </button>
                          </div>
                        )}

                        {/* professional request dispatch card */}
                        {msg.diagnosis.classification === "professional" && msg.diagnosis.serviceRequestDraft && (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <Wrench className="text-orange-500 animate-pulse" size={15} />
                              <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                                Technical Pro Dispatch Required
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center justify-between text-[11px] font-bold text-orange-500">
                              <span>Recommended Pro: {msg.diagnosis.serviceRequestDraft.category}</span>
                              {msg.diagnosis.serviceRequestDraft.urgency && (
                                <span className="bg-red-500/15 border border-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wide">Urgent</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleLaunchDispatchModal(msg.diagnosis?.serviceRequestDraft)}
                              className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                            >
                              <Sparkles size={13} className="animate-pulse" />
                              Raise Service request & Dispatch
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Loader */}
                {loading && (
                  <div className="flex justify-start items-center gap-2 text-slate-400 text-xs animate-fade-in pl-1">
                    <Loader2 size={12} className="animate-spin text-orange-500" />
                    <span>Diagnosing problem parameters...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Form Input Control bar */}
          {isAuthenticated && (
            <div className="border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 p-3 shrink-0 flex flex-col gap-1.5">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Describe leak, spark, repair issue..."
                  className="flex-1 glass-input rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-orange-500"
                  disabled={loading}
                  required
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-orange-500 dark:to-amber-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
              <p className="text-[9px] text-center font-semibold text-slate-400 dark:text-slate-500 select-none">
                ⚠ AI can make mistakes, so don't blindly trust it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── DISPATCH PROBLEM REQUEST MODAL ── */}
      <ProblemModal
        open={isProblemModalOpen}
        setopen={setIsProblemModalOpen}
        prefillName={prefillName}
        prefillDescription={prefillDescription}
        prefillCategory={prefillCategory}
      />
    </>
  );
}
