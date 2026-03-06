import { useEffect } from "react";

export default function StepDocs({ onBusyChange }) {
  useEffect(() => {
    onBusyChange?.(false);
  }, [onBusyChange]);

  return null;
}
