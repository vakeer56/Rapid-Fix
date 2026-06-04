import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "../config/firebase";
import api from "../service/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role?: "user" | "worker" | "admin";
  age?: number;
  gender?: string;
  experience?: number;
  located_address?: string;
  preferred_areas?: string[];
  photo?: string;
  verificationStatus?: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  firebaseUid: string;
  categories?: string[];
  completedJobs?: number;
  badge?: { tier: string; label: string };
  governmentVerification?: {
    status: "none" | "pending" | "approved" | "rejected";
    documentType?: string;
    documentNumber?: string;
    documentImages?: string[];
    submittedAt?: string;
    reviewedAt?: string;
    rejectionReason?: string;
  };
}

export interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  appToken: string | null;
  loading: boolean;
  /** Whether the user is fully authenticated (has both Firebase + app JWT) */
  isAuthenticated: boolean;
  /** Set after /auth/firebase returns needsProfile=true */
  needsProfile: boolean;
  /** Firebase user info returned when needsProfile is true */
  pendingFirebaseUser: { uid: string; email: string | null; name: string | null; picture: string | null } | null;
  setupToken: string | null;
  /** Called when the backend issues a JWT (sign-in complete) */
  onAuthSuccess: (token: string, user: AppUser) => void;
  /** Called when backend requires profile completion */
  onNeedsProfile: (
    setupToken: string,
    firebaseUser: { uid: string; email: string | null; name: string | null; picture: string | null }
  ) => void;
  /** Sign out from both Firebase and the app */
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem("rf_app_user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [appToken, setAppToken] = useState<string | null>(
    localStorage.getItem("rf_app_token")
  );
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState<AuthContextType["pendingFirebaseUser"]>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);

  // Synchronize persisted profile with the server on mount
  useEffect(() => {
    const syncProfile = async () => {
      const token = localStorage.getItem("rf_app_token");
      if (!token) return;
      try {
        const res = await api.get("/auth/me");
        if (res.data && res.data.success && res.data.account) {
          const userWithRole = {
            ...res.data.account,
            role: res.data.role
          };
          setAppUser(userWithRole);
          localStorage.setItem("rf_app_user", JSON.stringify(userWithRole));
        }
      } catch (err: any) {
        console.warn("[Auth] Profile sync with server failed or offline:", err);
        if (err.response?.status === 404) {
          console.log("[Auth] User profile not found in database. Signing out...");
          signOut();
        }
      }
    };
    syncProfile();
  }, []);

  // Dynamically sync and fetch Firebase credentials from the backend on mount
  useEffect(() => {
    const syncServerConfig = async () => {
      try {
        const res = await api.get("/auth/firebase-config");
        if (res.data && res.data.success && res.data.config) {
          const serverConfig = res.data.config;
          const currentConfigStr = localStorage.getItem("rf_firebase_config");
          const currentConfig = currentConfigStr ? JSON.parse(currentConfigStr) : {};

          // If the server has a valid API Key and it is different from client storage, sync and hot-reload
          if (serverConfig.apiKey) {
            const hasDifference =
              serverConfig.apiKey !== currentConfig.apiKey ||
              serverConfig.authDomain !== currentConfig.authDomain ||
              serverConfig.projectId !== currentConfig.projectId ||
              serverConfig.storageBucket !== currentConfig.storageBucket ||
              serverConfig.messagingSenderId !== currentConfig.messagingSenderId ||
              serverConfig.appId !== currentConfig.appId;

            if (hasDifference) {
              console.log("[Firebase] Syncing local Firebase configuration overrides with secure server settings...");
              localStorage.setItem("rf_firebase_config", JSON.stringify(serverConfig));
              window.location.reload();
            }
          }
        }
      } catch (err) {
        console.warn("[Firebase] Server configuration fetch skipped or offline. Falling back to local values.");
      }
    };
    syncServerConfig();
  }, []);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        // Logged out
        setAppUser(null);
        setAppToken(null);
        localStorage.removeItem("rf_app_token");
        localStorage.removeItem("rf_app_user");
        setLoading(false);
        return;
      }

      // Already have a valid app token (persisted from previous session)
      const existingToken = localStorage.getItem("rf_app_token");
      if (existingToken && appUser) {
        setLoading(false);
        return;
      }

      // Skip automatic backend lookup if in the middle of active email/password registration
      if (localStorage.getItem("rf_is_registering") === "true") {
        setLoading(false);
        return;
      }

      // Try to re-authenticate with backend using the fresh Firebase token
      try {
        const idToken = await fbUser.getIdToken();
        const res = await api.post("/auth/firebase", { idToken });
        const data = res.data;

        if (data.success && !data.needsProfile) {
          onAuthSuccess(data.token, data.user);
        } else if (data.success && data.needsProfile) {
          onNeedsProfile(data.setupToken, data.firebaseUser);
        }
      } catch {
        // Backend unreachable — silently degrade; user will see unauthenticated state
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAuthSuccess = (token: string, user: AppUser) => {
    setAppToken(token);
    setAppUser(user);
    setNeedsProfile(false);
    setPendingFirebaseUser(null);
    setSetupToken(null);
    localStorage.setItem("rf_app_token", token);
    localStorage.setItem("rf_app_user", JSON.stringify(user));
  };

  const onNeedsProfile = (
    st: string,
    fbUser: AuthContextType["pendingFirebaseUser"]
  ) => {
    setSetupToken(st);
    setPendingFirebaseUser(fbUser);
    setNeedsProfile(true);
    setLoading(false);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setAppToken(null);
    setAppUser(null);
    setFirebaseUser(null);
    setNeedsProfile(false);
    setPendingFirebaseUser(null);
    setSetupToken(null);
    localStorage.removeItem("rf_app_token");
    localStorage.removeItem("rf_app_user");
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        appToken,
        loading,
        isAuthenticated: !!appToken && !!appUser,
        needsProfile,
        pendingFirebaseUser,
        setupToken,
        onAuthSuccess,
        onNeedsProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
