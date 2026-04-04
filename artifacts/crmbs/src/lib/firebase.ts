import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDUReRjJYWRTSrIZDyRAzmp5_0gKgjqXME",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dbms-9403e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dbms-9403e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dbms-9403e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "619934120412",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:619934120412:web:b7581a7a30f033ebed3719",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4KEJSKRFGS",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

if (typeof window !== "undefined") {
  analyticsSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  }).catch(() => {
    // Ignore analytics in unsupported/local runtimes.
  });
}
