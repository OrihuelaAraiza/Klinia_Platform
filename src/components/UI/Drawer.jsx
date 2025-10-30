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

const drawerVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
};

export default function Drawer({
  open,
  onClose,
  title,
  children,
  width = 440,
  footer,
}) {
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
          className="ui-overlay ui-overlay--drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
          onClick={onClose}
        >
          <motion.aside
            className="ui-drawer"
            style={{ width }}
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            ref={containerRef}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ui-drawer__header">
              <div className="ui-drawer__title">{title}</div>
              <button type="button" className="ui-drawer__close" onClick={onClose}>
                <span aria-hidden="true">×</span>
                <span className="visually-hidden">Cerrar</span>
              </button>
            </header>
            <div className="ui-drawer__body">{children}</div>
            {footer ? <footer className="ui-drawer__footer">{footer}</footer> : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
