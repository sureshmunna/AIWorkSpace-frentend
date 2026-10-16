"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, Task } from "@/lib/api";

const badge: Record<Task["priority"], string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

export default function TaskPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api<Task[]>("/api/tasks") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const create = useMutation({
    mutationFn: () => api<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, description, dueDate: dueDate ? new Date(dueDate).toISOString() : null }),
    }),
    onSuccess: () => { setTitle(""); setDescription(""); setDueDate(""); refresh(); },
  });
  const update = useMutation({
    mutationFn: (v: { id: string; body: Partial<Task> }) => api<Task>(`/api/tasks/${v.id}`, { method: "PUT", body: JSON.stringify(v.body) }),
    // Optimistic update: the checkbox flips instantly, and is rolled back if the server rejects it.
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((t) => (t.id === v.id ? { ...t, ...v.body } : t)));
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(["tasks"], ctx.previous); },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  const prioritize = useMutation({
    mutationFn: (id: string) => api<Task>("/api/ai/prioritize", { method: "POST", body: JSON.stringify({ taskId: id }) }),
    onSuccess: refresh,
  });

  const error = create.error ?? update.error ?? remove.error ?? prioritize.error ?? tasks.error;

  return (
    <section className="space-y-4">
      <form className="card space-y-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) create.mutate(); }}>
        <input className="input" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input" rows={2} placeholder="Details (helps the AI prioritise)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-2">
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" />
          <button className="btn btn-primary shrink-0" disabled={create.isPending}>Add task</button>
        </div>
      </form>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error.message}</p>}
      {tasks.isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {tasks.data?.length === 0 && <p className="text-center text-sm text-slate-500">No tasks yet. Add one above.</p>}

      <ul className="space-y-3">
        {tasks.data?.map((t) => (
          <li key={t.id} className="card">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={t.isCompleted} aria-label={`Complete ${t.title}`}
                onChange={(e) => update.mutate({ id: t.id, body: { isCompleted: e.target.checked } })} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${t.isCompleted ? "text-slate-400 line-through" : ""}`}>{t.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[t.priority]}`}>{t.priority}</span>
                  {t.dueDate && <span className="text-xs text-slate-500">due {new Date(t.dueDate).toLocaleDateString()}</span>}
                </div>
                {t.description && <p className="mt-1 text-sm text-slate-600">{t.description}</p>}

                {t.aiPrioritySuggestion && (
                  <div className="mt-2 rounded-lg bg-indigo-50 p-2 text-sm text-indigo-900">
                    <p><span className="font-semibold">AI:</span> {t.aiPrioritySuggestion}
                      {t.aiTimeEstimateMinutes ? ` (about ${t.aiTimeEstimateMinutes} min)` : ""}</p>
                    {t.aiSubtasks.length > 0 && (
                      <ul className="mt-1 list-inside list-disc text-indigo-800">
                        {t.aiSubtasks.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-1">
              <button className="btn btn-ghost" disabled={prioritize.isPending && prioritize.variables === t.id}
                onClick={() => prioritize.mutate(t.id)}>
                {prioritize.isPending && prioritize.variables === t.id ? "Thinking..." : "AI prioritise"}
              </button>
              <button className="btn btn-danger" onClick={() => remove.mutate(t.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
