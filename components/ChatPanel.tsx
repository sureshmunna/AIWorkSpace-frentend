"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ChatMsg, streamChat } from "@/lib/api";

export default function ChatPanel() {
  const qc = useQueryClient();
  const history = useQuery({ queryKey: ["chat"], queryFn: () => api<ChatMsg[]>("/api/chat") });
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<ChatMsg[]>([]); // messages not yet in the saved history
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  const messages = [...(history.data ?? []), ...pending];

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, pending]);
  useEffect(() => () => abort.current?.abort(), []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput(""); setError(null); setBusy(true);
    setPending([{ role: "user", content: text }, { role: "assistant", content: "" }]);

    abort.current = new AbortController();
    try {
      await streamChat(text, (chunk) =>
        setPending((p) => p.map((m, i) => (i === 1 ? { ...m, content: m.content + chunk } : m))), abort.current.signal);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      await qc.invalidateQueries({ queryKey: ["chat"] });   // reload saved history, then drop the temporary copies
      setPending([]);
      setBusy(false);
    }
  }

  async function clear() {
    await api<void>("/api/chat", { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["chat"] });
  }

  return (
    <section className="card flex h-[70vh] flex-col">
      <div className="mb-2 flex justify-end">
        <button className="btn btn-ghost" onClick={clear} disabled={busy || !history.data?.length}>Clear chat</button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && !history.isLoading && (
          <p className="mt-10 text-center text-sm text-slate-500">Ask anything. The assistant can see your open tasks.</p>
        )}
        {messages.map((m, i) => (
          <div key={m.id ?? `p${i}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100"}`}>
              {m.content || <span className="text-slate-400">...</span>}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {(error || history.error) && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error ?? history.error?.message}</p>
      )}

      <form className="mt-3 flex gap-2" onSubmit={send}>
        <input className="input" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
        <button className="btn btn-primary" disabled={busy || !input.trim()}>Send</button>
      </form>
    </section>
  );
}
