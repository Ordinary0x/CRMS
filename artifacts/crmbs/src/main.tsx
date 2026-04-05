import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
if (rawApiBase) {
  setBaseUrl(rawApiBase);
}

createRoot(document.getElementById("root")!).render(<App />);
