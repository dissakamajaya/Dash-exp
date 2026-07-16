import { useCallback, useEffect, useState } from "react";
import { bind, setEnabled } from "cuelume";

const STORAGE_KEY = "hox-sound-enabled";

function readPref(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function useCuelume() {
  const [enabled, setEnabledState] = useState(readPref);

  useEffect(() => {
    bind();
  }, []);

  useEffect(() => {
    setEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // Storage unavailable — preference won't persist but sound still works.
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabledState((v) => !v), []);

  return { soundEnabled: enabled, toggleSound: toggle } as const;
}
