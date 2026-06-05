import { createContext, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle, ShieldAlert, Info, HelpCircle } from "lucide-react";

interface PopupOptions {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error" | "question";
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
  resolve?: (value: boolean) => void;
}

interface PopupContextType {
  showAlert: (title: string, message: string, type?: PopupOptions["type"]) => Promise<boolean>;
  showConfirm: (title: string, message: string, confirmText?: string, cancelText?: string) => Promise<boolean>;
}

const PopupContext = createContext<PopupContextType | null>(null);

export const usePopup = () => {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error("usePopup must be used inside a PopupProvider");
  return ctx;
};

export const PopupProvider = ({ children }: { children: ReactNode }) => {
  const [popup, setPopup] = useState<PopupOptions | null>(null);

  const showAlert = (title: string, message: string, type: PopupOptions["type"] = "info") => {
    return new Promise<boolean>((resolve) => {
      setPopup({
        title,
        message,
        type,
        confirmText: "OK",
        isConfirm: false,
        resolve,
      });
    });
  };

  const showConfirm = (title: string, message: string, confirmText = "Confirm", cancelText = "Cancel") => {
    return new Promise<boolean>((resolve) => {
      setPopup({
        title,
        message,
        type: "question",
        confirmText,
        cancelText,
        isConfirm: true,
        resolve,
      });
    });
  };

  const handleClose = (value: boolean) => {
    if (popup?.resolve) {
      popup.resolve(value);
    }
    setPopup(null);
  };

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {popup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => !popup.isConfirm && handleClose(false)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 glass-panel p-6 shadow-2xl animate-slide-up flex flex-col items-center text-center">
            
            {/* Type Icon indicator */}
            <div className="mb-4">
              {popup.type === "success" && (
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce-slow">
                  <CheckCircle size={28} />
                </div>
              )}
              {popup.type === "error" && (
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center animate-bounce-slow">
                  <ShieldAlert size={28} />
                </div>
              )}
              {popup.type === "warning" && (
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center animate-bounce-slow">
                  <AlertCircle size={28} />
                </div>
              )}
              {popup.type === "info" && (
                <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center animate-bounce-slow">
                  <Info size={28} />
                </div>
              )}
              {popup.type === "question" && (
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center animate-bounce-slow">
                  <HelpCircle size={28} />
                </div>
              )}
            </div>

            {/* Title & Message */}
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 tracking-wide leading-tight">
              {popup.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed whitespace-pre-wrap max-w-sm">
              {popup.message}
            </p>

            {/* Action Buttons */}
            <div className="w-full flex gap-3 justify-center">
              {popup.isConfirm && (
                <button
                  onClick={() => handleClose(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all-premium cursor-pointer active:scale-95"
                >
                  {popup.cancelText || "Cancel"}
                </button>
              )}
              <button
                onClick={() => handleClose(true)}
                className={`py-2.5 rounded-xl text-white text-xs font-black shadow-lg transition-all-premium cursor-pointer active:scale-95 ${
                  popup.isConfirm ? "flex-1" : "px-8"
                } ${
                  popup.type === "error"
                    ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/10"
                    : popup.type === "warning"
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/10"
                    : popup.type === "success"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/10"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-orange-500 dark:to-amber-500 hover:from-blue-500 hover:to-indigo-500 dark:hover:from-orange-400 dark:hover:to-amber-400 shadow-blue-500/10 dark:shadow-orange-500/10"
                }`}
              >
                {popup.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
};
