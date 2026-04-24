import { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Copy, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/Markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const LANGS = ["auto", "javascript", "typescript", "python", "java", "go", "rust", "cpp", "ruby", "php", "csharp"];

const SnippetExplain = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const explain = async () => {
    if (!code.trim()) {
      toast.error("Paste some code first");
      return;
    }
    setLoading(true);
    setExplanation("");
    try {
      const { data, error } = await supabase.functions.invoke("explain-snippet", {
        body: { code, language },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setExplanation(data.explanation_md || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to explain code");
    } finally {
      setLoading(false);
    }
  };

  const lineCount = code.split("\n").length;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-40" />
      <div className="relative">
        <SiteHeader />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {/* Nav */}
          <div className="mb-4 flex justify-center">
            <nav className="flex items-center gap-1.5 rounded-full border border-border bg-card p-1 text-xs shadow-soft">
              {[
                { to: "/", label: "repo" },
                { to: "/explain", label: "snippet" },
                { to: "/developer", label: "developer", starred: true },
              ].map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono transition-all",
                      n.starred && !isActive &&
                      "bg-gradient-to-r from-primary/10 to-primary/5 text-foreground ring-1 ring-primary/30 hover:ring-primary/60",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                        : !n.starred && "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )
                  }
                >
                  {n.starred && (
                    <Star
                      className="h-3 w-3 fill-current text-primary"
                      strokeWidth={2}
                    />
                  )}
                  ./{n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <button
            onClick={() => navigate("/")}
            className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> back
          </button>

          <div className="mb-6">
            <h1 className="font-mono text-2xl font-bold tracking-tight md:text-3xl">
              <span className="text-muted-foreground">{"// "}</span>
              explain a code snippet
            </h1>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              Paste any function, file, or block of code. Get a plain-English walkthrough —
              what it does, how it works, and why.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Editor */}
            <div className="terminal overflow-hidden shadow-soft">
              <div className="flex items-center justify-between border-b border-border/60 bg-background/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="terminal-dot bg-red-500/80" />
                  <span className="terminal-dot bg-yellow-500/80" />
                  <span className="terminal-dot bg-green-500/80" />
                  <span className="ml-2 font-mono text-xs text-terminal-foreground/60">
                    snippet.{language === "auto" ? "txt" : language}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="rounded border border-border/50 bg-background/20 px-2 py-0.5 font-mono text-xs text-terminal-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {LANGS.map((l) => <option key={l} value={l} className="bg-background text-foreground">{l}</option>)}
                  </select>
                  {code && (
                    <button
                      onClick={() => setCode("")}
                      className="text-terminal-foreground/60 hover:text-terminal-foreground"
                      title="Clear"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`// paste your code here\nfunction hello(name) {\n  return \`hi, \${name}\`;\n}`}
                  spellCheck={false}
                  className="min-h-[420px] resize-none rounded-none border-0 bg-transparent font-mono text-sm text-terminal-foreground placeholder:text-terminal-foreground/30 focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border/60 bg-background/10 px-3 py-2 font-mono text-xs text-terminal-foreground/60">
                <span>{lineCount} line{lineCount !== 1 ? "s" : ""} · {code.length} chars</span>
                <Button
                  onClick={explain}
                  disabled={loading || !code.trim()}
                  size="sm"
                  className="h-7 gap-1.5 font-mono text-xs"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {loading ? "thinking…" : "explain"}
                </Button>
              </div>
            </div>

            {/* Output */}
            <div className="rounded-lg border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="font-mono text-xs text-muted-foreground">./explanation.md</span>
                {explanation && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(explanation); toast.success("Copied"); }}
                    className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" /> copy
                  </button>
                )}
              </div>
              <div className="min-h-[420px] p-5">
                {loading && !explanation && (
                  <div className="space-y-2 font-mono text-sm text-muted-foreground">
                    <div><span className="text-primary">{">"}</span> reading your code<span className="caret" /></div>
                    <div className="text-syntax-comment">// breaking it down line by line…</div>
                  </div>
                )}
                {!loading && !explanation && (
                  <div className="font-mono text-sm text-muted-foreground">
                    <div className="text-syntax-comment">// paste code on the left and hit 'explain'</div>
                    <div className="mt-3 text-xs">The AI will:</div>
                    <ul className="mt-1 list-none space-y-1 text-xs">
                      <li><span className="text-primary">→</span> summarize what the code does</li>
                      <li><span className="text-primary">→</span> walk through it step by step</li>
                      <li><span className="text-primary">→</span> flag gotchas &amp; best-practice notes</li>
                    </ul>
                  </div>
                )}
                {explanation && <Markdown>{explanation}</Markdown>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SnippetExplain;
