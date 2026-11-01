import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase.js';

/**
 * Standardized Firebase Authentication Service
 */

export const isFirebaseReady = () => isFirebaseConfigured && auth !== null;

/**
 * Configure Firebase persistence based on Remember Me preference:
 * - true  -> browserLocalPersistence (stored in IndexedDB across browser restarts)
 * - false -> browserSessionPersistence (stored only for the active browser session)
 */
export const configureFirebasePersistence = async (rememberMe = false) => {
  if (!isFirebaseReady()) return;
  try {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
  } catch (err) {
    console.warn('Could not set Firebase persistence mode:', err.message);
  }
};

/**
 * Maps Firebase Auth error codes to clear, actionable user messages
 */
export const formatFirebaseAuthError = (err) => {
  if (!err) return 'Authentication failed. Please try again.';
  const code = err.code || err.message;
  switch (code) {
    case 'auth/popup-blocked':
      return 'The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled: The Google popup window was closed before completing authentication.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in popup is already open. Please complete or close the existing popup.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Console. Please add this host (e.g. localhost or your deployment URL) to Firebase Authentication -> Settings -> Authorized Domains.';
    case 'auth/network-request-failed':
      return 'Network connection failed while connecting to Google. Please check your internet connection.';
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled in Firebase Console. Please enable the Google sign-in provider in Authentication -> Sign-in method.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address using different sign-in credentials.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid credentials. Please verify your email and password.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed login attempts. Please try again later.';
    default:
      return err.message || 'Authentication failed. Please try again.';
  }
};

/**
 * Sign in with Email and Password via Firebase
 */
export const firebaseSignInWithEmail = async (email, password, rememberMe = false) => {
  if (!isFirebaseReady()) {
    throw new Error('Firebase Authentication is not configured in client/.env.');
  }
  try {
    await configureFirebasePersistence(rememberMe);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    return { user: credential.user, idToken };
  } catch (err) {
    const formatted = formatFirebaseAuthError(err);
    const customErr = new Error(formatted);
    customErr.code = err.code;
    customErr.originalError = err;
    throw customErr;
  }
};

/**
 * Register user with Email and Password via Firebase
 */
export const firebaseRegisterWithEmail = async (email, password) => {
  if (!isFirebaseReady()) {
    throw new Error('Firebase Authentication is not configured in client/.env.');
  }
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Optionally trigger email verification in background
    try {
      await sendEmailVerification(credential.user);
    } catch (verifyErr) {
      console.warn('Could not dispatch Firebase email verification:', verifyErr.message);
    }

    const idToken = await credential.user.getIdToken();
    return { user: credential.user, idToken };
  } catch (err) {
    const formatted = formatFirebaseAuthError(err);
    const customErr = new Error(formatted);
    customErr.code = err.code;
    customErr.originalError = err;
    throw customErr;
  }
};

/**
 * Sign in or Sign up with Google via Firebase Popup
 */
export const firebaseSignInWithGoogle = async (rememberMe = false) => {
  if (!isFirebaseReady()) {
    throw new Error('Firebase Authentication is not configured in client/.env.');
  }
  try {
    await configureFirebasePersistence(rememberMe);
    const credential = await signInWithPopup(auth, googleProvider);
    const idToken = await credential.user.getIdToken();
    return { user: credential.user, idToken };
  } catch (err) {
    const formatted = formatFirebaseAuthError(err);
    const customErr = new Error(formatted);
    customErr.code = err.code;
    customErr.originalError = err;
    throw customErr;
  }
};

/**
 * Send password reset email via Firebase
 */
export const firebaseSendPasswordReset = async (email) => {
  if (!isFirebaseReady()) {
    throw new Error('Firebase Authentication is not configured in client/.env.');
  }
  await sendPasswordResetEmail(auth, email);
};

/**
 * Get current Firebase user ID token
 */
export const getFirebaseIdToken = async (forceRefresh = false) => {
  if (!isFirebaseReady() || !auth.currentUser) {
    return null;
  }
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
};

/**
 * Sign out from Firebase
 */
export const firebaseSignOut = async () => {
  if (isFirebaseReady() && auth.currentUser) {
    await signOut(auth);
  }
};
