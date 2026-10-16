"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import MeetingPanel from "@/components/MeetingPanel";
import TaskPanel from "@/components/TaskPanel";
import { useAuth } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

const TABS = ["Tasks", "Meetings", "Chat"] as const;
type Tab = (typeof TABS)[number];

export default function Dashboard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const [tab, setTab] = useState<Tab>("Tasks");

  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
  }, [hydrated, session, router]);

  if (!hydrated || !session) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">AI Workspace</h1>
          <p className="text-sm text-slate-500">Hi, {session.fullName}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => { logout(); router.replace("/login"); }}>Log out</button>
      </header>

      <nav className="mb-4 flex gap-1 rounded-xl bg-slate-200 p-1" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {tab === "Tasks" && <TaskPanel />}
      {tab === "Meetings" && <MeetingPanel />}
      {tab === "Chat" && <ChatPanel />}
    </div>
  );
}
