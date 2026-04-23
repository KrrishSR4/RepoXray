import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/Markdown";
import type { AnalysisResult } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

function buildContext(r: AnalysisResult): string {
  const { repo, explanation, tree } = r;
  const topFiles = tree.filter((t) => t.type === "blob").slice(0, 80).map((t) => t.path).join("\n");
  return [
    `Repo: ${repo.full_name}`,
    `Description: ${repo.description || "(none)"}`,
    `Language: ${repo.language || "unknown"}`,
    `Tagline: ${explanation.tagline}`,
    `Key concepts: ${explanation.key_concepts.join(", ")}`,
    `Tech stack: ${explanation.tech_stack.join(", ")}`,
    `Important files:\n${explanation.important_files.map((f) => `- ${f.path}: ${f.purpose}`).join("\n")}`,
    `Sample file paths:\n${topFiles}`,
    `Overview:\n${explanation.overview_md}`,
  ].join("\n\n").slice(0, 12_000);
}

export function RepoChat({ result }: { result: AnalysisResult }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-repo`;
    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          context: buildContext(result),
          messages: [...messages, userMsg],
        }),
      });
      if (resp.status === 429) { toast.error("Rate limit — try again shortly."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted. Add credits in Lovable Cloud settings."); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed to start chat stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content as string | undefined;
            if (c) upsert(c);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Chat failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <div className="font-serif-display text-base">Ask the repo</div>
        <div className="ml-auto text-xs text-muted-foreground">Your AI tutor</div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md space-y-3 py-8 text-center text-sm text-muted-foreground">
            <p>Ask any question about this codebase.</p>
            <div className="grid gap-2">
              {[
                "Where should I start reading?",
                "Explain the main entry point like I'm new.",
                "How does data flow through this app?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-left text-foreground/80 hover:bg-accent/60"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-soft",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border",
              )}
            >
              {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask a question about this repo…"
            className="min-h-[44px] max-h-40 resize-none"
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
