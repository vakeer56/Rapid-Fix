
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * Dynamic Firebase configuration loader.
 * Priority:  localStorage override (set by Super-Admin Control Center)
 *         -> import.meta.env (from .env file)
 */
const getFirebaseConfig = () => {
  const overrides = localStorage.getItem("rf_firebase_config");
  const dynamic = overrides ? JSON.parse(overrides) : null;

  const config = {
    apiKey:            dynamic?.apiKey            || import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        dynamic?.authDomain        || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         dynamic?.projectId         || import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     dynamic?.storageBucket     || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: dynamic?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             dynamic?.appId             || import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId:     dynamic?.measurementId     || import.meta.env.VITE_FIREBASE_MESAURE_ID
  };

  // If there's no apiKey (unconfigured yet), return a dummy config so initializeApp doesn't crash on boot.
  // This allows the user to access the /super-admin panel and configure their keys.
  if (!config.apiKey) {
    console.warn("[Firebase] No apiKey found in environment or localStorage. Using a placeholder configuration to prevent boot crash. Please configure real keys via the Super-Admin panel.");
    return {
      apiKey: "AIzaSyDummyKeyPlaceholder_1234567890abcdef",
      authDomain: "rapid-fix-dummy.firebaseapp.com",
      projectId: "rapid-fix-dummy",
      storageBucket: "rapid-fix-dummy.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:1234567890abcdef"
    };
  }

  return config;
};

const app: FirebaseApp = initializeApp(getFirebaseConfig());
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");
