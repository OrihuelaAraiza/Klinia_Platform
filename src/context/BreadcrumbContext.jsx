import { useCallback, useMemo, useState } from "react";
import { BreadcrumbContext } from "./breadcrumb-context";

export function BreadcrumbProvider({ children }) {
  const [labels, setLabels] = useState({});

  const setLabel = useCallback((key, label) => {
    if (!key) return;
    setLabels((prev) => {
      if (prev[key] === label) return prev;
      if (label == null || label === "") {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: label };
    });
  }, []);

  const getLabel = useCallback((key) => labels[key] ?? null, [labels]);

  const value = useMemo(() => ({ labels, setLabel, getLabel }), [labels, setLabel, getLabel]);

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}
