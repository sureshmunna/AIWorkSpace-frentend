"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const go = () => router.replace(useAuth.getState().session ? "/dashboard" : "/login");
    if (useAuth.persist.hasHydrated()) go();
    else return useAuth.persist.onFinishHydration(go);
  }, [router]);
  return null;
}
