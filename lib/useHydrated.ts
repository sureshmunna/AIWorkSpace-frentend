import { useEffect, useState } from "react";
import { useAuth } from "./store";

/** True once zustand has read the saved session from localStorage (avoids a false "logged out" flash). */
export function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useAuth.persist.hasHydrated()) setReady(true);
    return useAuth.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}
