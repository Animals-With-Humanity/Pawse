import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: "", type: "info", show: false });
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = "info") => {
    clearTimeout(timerRef.current);
    setToast({ message, type, show: true });
    timerRef.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={`toast ${toast.type} ${toast.show ? "show" : ""}`}>{toast.message}</div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
