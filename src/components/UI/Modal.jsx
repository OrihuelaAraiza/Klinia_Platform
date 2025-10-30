import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function useFocusTrap(enabled, containerRef) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const previousActive = document.activeElement;
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const focusables = container.querySelectorAll(FOCUSABLE_SELECTOR);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (first) {
      first.focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    function handleKeyDown(event) {
      if (event.key !== "Tab" || focusables.length === 0) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (previousActive && "focus" in previousActive) {
        previousActive.focus();
      }
    };
  }, [enabled, containerRef]);
}

function usePreventScroll(enabled) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [enabled]);
}

const modalVariants = {
  hidden: { y: 16, opacity: 0, scale: 0.96 },
  visible: { y: 0, opacity: 1, scale: 1 },
  exit: { y: 12, opacity: 0, scale: 0.96 },
};

export default function Modal({ open, onClose, title, children, footer }) {
  const containerRef = useRef(null);
  useFocusTrap(open, containerRef);
  usePreventScroll(open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleKeydown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open, onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="ui-overlay ui-overlay--modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
          onClick={onClose}
        >
          <motion.div
            className="ui-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            ref={containerRef}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ui-modal__header">
              <div className="ui-modal__title">{title}</div>
              <button type="button" className="ui-modal__close" onClick={onClose}>
                <span aria-hidden="true">×</span>
                <span className="visually-hidden">Cerrar</span>
              </button>
            </header>
            <div className="ui-modal__body">{children}</div>
            {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
