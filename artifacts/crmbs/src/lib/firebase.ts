import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

function requiredEnv(name: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: requiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requiredEnv("VITE_FIREBASE_APP_ID"),
  measurementId: requiredEnv("VITE_FIREBASE_MEASUREMENT_ID"),
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
