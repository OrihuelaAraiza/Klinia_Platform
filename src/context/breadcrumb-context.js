import { createContext, useContext, useEffect, useRef } from "react";

export const BreadcrumbContext = createContext(null);

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbContext debe usarse dentro de <BreadcrumbProvider>.");
  }
  return ctx;
}

export function useBreadcrumbLabel(key, label) {
  const ctx = useContext(BreadcrumbContext);
  const setLabel = ctx?.setLabel;
  const lastKeyRef = useRef(null);

  useEffect(() => {
    if (!setLabel || !key) return undefined;
    setLabel(key, label);
    lastKeyRef.current = key;
    return () => {
      if (lastKeyRef.current) {
        setLabel(lastKeyRef.current, null);
      }
    };
  }, [setLabel, key, label]);
}
