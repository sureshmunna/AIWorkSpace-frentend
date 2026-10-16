import { useAuth } from "./store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5199";

export type Task = {
  id: string; title: string; description: string; priority: "Low" | "Medium" | "High";
  isCompleted: boolean; dueDate: string | null; createdAt: string;
  aiPrioritySuggestion: string | null; aiTimeEstimateMinutes: number | null; aiSubtasks: string[];
};
export type ActionItem = { task: string; owner: string | null };
export type Meeting = {
  id: string; title: string; rawNotes: string; summary: string; decisions: string[]; actionItems: ActionItem[]; createdAt: string;
};
export type ChatMsg = { id?: string; role: "user" | "assistant"; content: string };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function authHeader(): Record<string, string> {
  const token = useAuth.getState().session?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function toError(res: Response): Promise<ApiError> {
  let msg = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body.errors) msg = Object.values(body.errors as Record<string, string[]>).flat().join(" ");
    else msg = body.detail ?? body.title ?? msg;
  } catch { /* not JSON */ }
  if (res.status === 401 && useAuth.getState().session) useAuth.getState().logout();
  return new ApiError(msg, res.status);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...authHeader(), ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(`Cannot reach the API at ${API_URL}. Is the C# backend running?`, 0);
  }
  if (!res.ok) throw await toError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Streams the assistant reply; calls onChunk with each piece of text as it arrives. */
export async function streamChat(message: string, onChunk: (text: string) => void, signal?: AbortSignal) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ message }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    throw new ApiError(`Cannot reach the API at ${API_URL}. Is the C# backend running?`, 0);
  }
  if (!res.ok) throw await toError(res);
  if (!res.body) throw new ApiError("Streaming is not supported by this browser.", 0);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
