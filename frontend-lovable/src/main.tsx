import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Polyfill Buffer for Solana web3.js
window.Buffer = Buffer;

// Global error handlers for debugging
window.onerror = (message, source, lineno, colno, error) => {
  console.error("[CleanProof] Global error:", { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = (event) => {
  console.error("[CleanProof] Unhandled promise rejection:", event.reason);
};

console.log("[CleanProof] App starting...", {
  userAgent: navigator.userAgent,
  isPhantom: navigator.userAgent.includes('Phantom'),
  hasPhantomProvider: !!window.phantom?.solana
});

createRoot(document.getElementById("root")!).render(<App />);
