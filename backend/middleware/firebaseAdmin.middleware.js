const admin = require('firebase-admin');

// Initialize Firebase Admin SDK lazily using environment variables.
// For a service account, set FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL in .env.
// Falls back to REST-based token verification using FIREBASE_API_KEY.
let adminInitialized = false;

const initAdmin = () => {
  if (adminInitialized || admin.apps.length > 0) return;
  try {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "rapid-fix-dummy";
    
    if (privateKey && clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // Minimal init for REST-based verification fallback
      admin.initializeApp({ projectId });
    }
    adminInitialized = true;
  } catch (e) {
    console.error('[FirebaseAdmin] Init error:', e.message);
  }
};

/**
 * Verify a Firebase ID token.
 * Tries firebase-admin first, falls back to Firebase REST API.
 * Returns decoded user payload: { uid, email, name, picture }
 */
const verifyFirebaseToken = async (idToken) => {
  initAdmin();
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || null,
      picture: decoded.picture || null,
    };
  } catch (adminErr) {
    // Fallback: use Firebase REST API with API key
    console.warn('[FirebaseAdmin] Admin SDK verify failed, trying REST fallback:', adminErr.message);
    const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) throw new Error('FIREBASE_API_KEY not set for REST fallback');

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.users || data.users.length === 0) throw new Error('Token invalid: no user found');
    const u = data.users[0];
    return {
      uid: u.localId,
      email: u.email || null,
      name: u.displayName || null,
      picture: u.photoUrl || null,
    };
  }
};

module.exports = { verifyFirebaseToken };
