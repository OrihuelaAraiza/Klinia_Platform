import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const ToastContext = createContext(null);

let toastId = 0;

const variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.96 },
};

function ToastContainer({ toasts, dismiss }) {
  return createPortal(
    <div className="ui-toast-stack" role="status" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`ui-toast ui-toast--${toast.variant}`}
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.22 }}
          >
            <div className="ui-toast__content">
              {toast.title ? <strong>{toast.title}</strong> : null}
              <span>{toast.message}</span>
            </div>
            <button type="button" className="ui-toast__close" onClick={() => dismiss(toast.id)}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Cerrar</span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((toast) => {
    toastId += 1;
    const id = toastId;
    setToasts((current) => [...current, { id, variant: "neutral", ...toast }]);
    if (toast.duration !== Infinity) {
      const timer = setTimeout(() => dismiss(id), toast.duration ?? 4200);
      timers.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  const value = useMemo(
    () => ({
      notify: (message, options = {}) =>
        pushToast({ message, ...options, variant: options.variant || "neutral" }),
      success: (message, options = {}) =>
        pushToast({ message, ...options, variant: "success" }),
      error: (message, options = {}) =>
        pushToast({ message, ...options, variant: "danger" }),
      warn: (message, options = {}) =>
        pushToast({ message, ...options, variant: "warning" }),
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
