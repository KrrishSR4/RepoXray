import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { ArrowRight, Github, FileCode2, FolderTree, BookOpen, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { LoadingStages } from "@/components/LoadingStages";
import { useAnalysisStore } from "@/store/analysis";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EXAMPLES = [
  "vercel/next.js",
  "expressjs/express",
  "pallets/flask",
];

const Index = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { setResult, setLoadingStage, setError } = useAnalysisStore();

  const analyze = async (repoUrl: string) => {
    const clean = repoUrl.trim();
    if (!clean) return;
    const fullUrl = clean.startsWith("http") ? clean : `https://github.com/${clean}`;
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStage(0);

    try {
      setLoadingStage(1);
      const { data, error } = await supabase.functions.invoke("analyze-repo", {
        body: { url: fullUrl },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setLoadingStage(3);
      setResult(data);
      navigate("/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Grid backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" />

      <div className="relative">
        <SiteHeader />

        <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 md:pt-14">
          {loading ? (
            <LoadingStages />
          ) : (
            <div className="animate-in-soft">
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

              <h1 className="text-center font-mono text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                <span className="text-muted-foreground">{"// "}</span>
                read any codebase
                <br />
                <span className="text-primary">like a senior dev</span>
                <span className="caret" />
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-center font-sans text-base text-muted-foreground md:text-lg">
                Paste a GitHub repo or a code snippet. Get a structured tour — what it does,
                how it's organized, which files matter, and where to start reading.
              </p>

              {/* Main input — looks like a code editor line */}
              <form
                onSubmit={(e) => { e.preventDefault(); analyze(url); }}
                className="mx-auto mt-10 max-w-2xl"
              >
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-soft transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="flex items-center gap-2 pl-2 font-mono text-sm text-muted-foreground">
                    <Github className="h-4 w-4" />
                    <span className="hidden text-primary sm:inline">$</span>
                  </div>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="github.com/owner/repo  or  owner/repo"
                    className="flex-1 border-0 bg-transparent font-mono text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
                  />
                  <Button type="submit" className="h-10 gap-1.5 font-mono">
                    explain <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quick examples */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">try:</span>
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => { setUrl(ex); analyze(ex); }}
                      className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-foreground/80 transition-colors hover:border-primary/60 hover:text-primary"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </form>

              {/* OR divider + snippet CTA */}
              <div className="mx-auto mt-12 flex max-w-2xl items-center gap-3 font-mono text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="mx-auto mt-6 grid max-w-2xl gap-3 md:grid-cols-2">
                <button
                  onClick={() => navigate("/explain")}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/60"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <FileCode2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-semibold">paste &amp; explain a snippet</div>
                    <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                      Line-by-line explanation in plain English.
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </button>
                <button
                  onClick={() => navigate("/developer")}
                  className="group flex items-start gap-3 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-4 text-left shadow-soft transition-all hover:border-primary/60 hover:shadow-[0_0_24px_-8px_hsl(var(--primary)/0.5)]"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/20 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-mono text-sm font-semibold">
                      developer mode
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] text-primary">PRO</span>
                    </div>
                    <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                      Profile score, README generator, SEO &amp; mentor tips.
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </button>
              </div>

              {/* Feature cards — code comment styled */}
              <div className="mx-auto mt-16 grid max-w-4xl gap-3 md:grid-cols-3">
                {[
                  { icon: BookOpen, t: "friendly overview", d: "Plain-language summary of what the project does and who it's for." },
                  { icon: FolderTree, t: "guided structure", d: "Interactive file tree with short notes on every folder." },
                  { icon: Sparkles, t: "start-here path", d: "Tutor-style reading order so you never get lost." },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.t} className="rounded-lg border border-border bg-card p-5 shadow-soft">
                      <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                        <Icon className="h-4 w-4 text-primary" />
                        {f.t}
                      </div>
                      <p className="mt-2 font-sans text-sm text-muted-foreground">
                        <span className="font-mono text-syntax-comment">// </span>
                        {f.d}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
