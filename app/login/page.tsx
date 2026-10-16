"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Session, useAuth } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useAuth((s) => s.session);
  const setSession = useAuth((s) => s.setSession);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  useEffect(() => {
    if (hydrated && session) router.replace("/dashboard");
  }, [hydrated, session, router]);

  const auth = useMutation({
    mutationFn: () =>
      api<Session>(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email: form.email, password: form.password } : form),
      }),
    onSuccess: (s) => {
      setSession(s);
      router.replace("/dashboard");
    },
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        className="card w-full max-w-sm space-y-4 p-6"
        onSubmit={(e) => { e.preventDefault(); auth.mutate(); }}
      >
        <div>
          <h1 className="text-2xl font-bold">AI Workspace</h1>
          <p className="text-sm text-slate-500">{mode === "login" ? "Sign in to your workspace" : "Create your account"}</p>
        </div>

        {mode === "register" && (
          <input className="input" placeholder="Full name" value={form.fullName} onChange={set("fullName")} required />
        )}
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={set("email")} required />
        <input className="input" type="password" placeholder="Password (min 6 characters)" minLength={6} value={form.password} onChange={set("password")} required />

        {auth.error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{auth.error.message}</p>}

        <button className="btn btn-primary w-full" disabled={auth.isPending}>
          {auth.isPending ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <button type="button" className="w-full text-center text-sm text-indigo-600 hover:underline"
          onClick={() => { auth.reset(); setMode(mode === "login" ? "register" : "login"); }}>
          {mode === "login" ? "No account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
