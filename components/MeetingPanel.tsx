"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, Meeting } from "@/lib/api";

export default function MeetingPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [createTasks, setCreateTasks] = useState(true);

  const meetings = useQuery({ queryKey: ["meetings"], queryFn: () => api<Meeting[]>("/api/meetings") });

  const summarize = useMutation({
    mutationFn: () => api<Meeting>("/api/ai/summarize", { method: "POST", body: JSON.stringify({ title, notes, createTasks }) }),
    onSuccess: () => {
      setTitle(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/meetings/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const error = summarize.error ?? remove.error ?? meetings.error;

  return (
    <section className="space-y-4">
      <form className="card space-y-2" onSubmit={(e) => { e.preventDefault(); summarize.mutate(); }}>
        <input className="input" placeholder="Meeting title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={6} placeholder="Paste your raw meeting notes here..." value={notes}
          onChange={(e) => setNotes(e.target.value)} required minLength={10} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={createTasks} onChange={(e) => setCreateTasks(e.target.checked)} />
            Add action items to my tasks
          </label>
          <button className="btn btn-primary" disabled={summarize.isPending}>{summarize.isPending ? "Summarising..." : "Summarise"}</button>
        </div>
      </form>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
      {meetings.data?.length === 0 && <p className="text-center text-sm text-slate-500">No summaries yet.</p>}

      <ul className="space-y-3">
        {meetings.data?.map((m) => (
          <li key={m.id} className="card space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{m.title}</h3>
                <p className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
              <button className="btn btn-danger" onClick={() => remove.mutate(m.id)}>Delete</button>
            </div>
            <p className="text-sm">{m.summary}</p>
            {m.decisions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold">Decisions</h4>
                <ul className="list-inside list-disc text-sm text-slate-700">{m.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
            {m.actionItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold">Action items</h4>
                <ul className="list-inside list-disc text-sm text-slate-700">
                  {m.actionItems.map((a, i) => <li key={i}>{a.task}{a.owner ? ` - ${a.owner}` : ""}</li>)}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
