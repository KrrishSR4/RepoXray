import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, ExternalLink, FileText, FolderTree,
  MessageCircle, RefreshCw, Search, Sparkles, Star, Copy, Share2, GitFork,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/Markdown";
import { FileTree } from "@/components/FileTree";
import { RepoChat } from "@/components/RepoChat";
import { useAnalysisStore } from "@/store/analysis";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ImportantFile } from "@/types/analysis";

type TabKey = "overview" | "structure" | "files" | "start" | "chat";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "structure", label: "Structure", icon: FolderTree },
  { key: "files", label: "File Explanations", icon: FileText },
  { key: "start", label: "Start Here Guide", icon: Sparkles },
  { key: "chat", label: "Ask Questions", icon: MessageCircle },
];

const Dashboard = () => {
  const { result, setResult } = useAnalysisStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");
  const [regenerating, setRegenerating] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!result) navigate("/");
  }, [result, navigate]);

  const filteredFiles = useMemo<ImportantFile[]>(() => {
    if (!result) return [];
    const q = search.trim().toLowerCase();
    if (!q) return result.explanation.important_files;
    return result.explanation.important_files.filter((f) =>
      f.path.toLowerCase().includes(q) ||
      f.purpose.toLowerCase().includes(q) ||
      f.explanation_md.toLowerCase().includes(q)
    );
  }, [result, search]);

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-4xl space-y-4 p-8">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const { repo, explanation, tree, readme_raw } = result;

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-repo", {
        body: { url: repo.html_url },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success("Explanation regenerated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to regenerate.");
    } finally {
      setRegenerating(false);
    }
  };

  const copyAll = async () => {
    const text = [
      `# ${repo.full_name}`,
      explanation.tagline,
      "",
      "## Overview",
      explanation.overview_md,
      "",
      "## Start Here",
      explanation.start_here_md,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Explanation copied to clipboard");
  };

  const share = async () => {
    const shareData = { title: `CodeExplain Pro — ${repo.full_name}`, text: explanation.tagline, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
    } catch { /* user cancelled */ }
  };

  const complexityColor =
    explanation.complexity === "Beginner" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : explanation.complexity === "Intermediate" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
    : "bg-rose-500/15 text-rose-700 dark:text-rose-400";

  return (
    <div className="min-h-screen bg-gradient-paper">
      <SiteHeader />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        {/* Sticky sidebar */}
        <aside className="md:sticky md:top-[4.5rem] md:h-[calc(100vh-5rem)]">
          <div className="space-y-1 rounded-xl border border-border bg-card p-2 shadow-soft">
            <Link to="/" className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60">
              <ArrowLeft className="h-4 w-4" /> New analysis
            </Link>
            <div className="my-1 h-px bg-border" />
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active ? "bg-primary/10 text-primary font-medium" : "text-foreground/80 hover:bg-accent/60",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground shadow-soft">
            <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> {repo.stars.toLocaleString()} stars</div>
            <div className="flex items-center gap-1.5"><GitFork className="h-3.5 w-3.5" /> {repo.forks.toLocaleString()} forks</div>
            {repo.language && <div>Primary: <span className="text-foreground">{repo.language}</span></div>}
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          {/* Repo header */}
          <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-page">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{repo.owner}/</div>
                <h1 className="font-serif-display text-2xl font-medium tracking-tight md:text-3xl">{repo.name}</h1>
                <p className="mt-2 max-w-2xl text-sm text-foreground/85">{explanation.tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={cn("border-0", complexityColor)}>{explanation.complexity}</Badge>
                  {explanation.tech_stack.slice(0, 5).map((t) => (
                    <Badge key={t} variant="outline" className="border-border/80 bg-background/60 font-normal">{t}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerating}>
                  <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", regenerating && "animate-spin")} />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={copyAll}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy</Button>
                <Button variant="outline" size="sm" onClick={share}><Share2 className="mr-1.5 h-3.5 w-3.5" />Share</Button>
                <a href={repo.html_url} target="_blank" rel="noreferrer">
                  <Button size="sm"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />GitHub</Button>
                </a>
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="mb-4 flex w-full flex-wrap justify-start bg-card md:hidden">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="animate-in-soft">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
                <Markdown>{`# Overview\n\n${explanation.overview_md}`}</Markdown>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background/60 p-5">
                    <h3 className="font-serif-display text-lg">Key concepts</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {explanation.key_concepts.map((c) => (
                        <Badge key={c} variant="secondary" className="font-normal">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 p-5">
                    <h3 className="font-serif-display text-lg">Tech stack</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {explanation.tech_stack.map((c) => (
                        <Badge key={c} variant="outline" className="font-normal">{c}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {readme_raw && (
                  <details className="mt-8 rounded-xl border border-border bg-background/60 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-foreground/80">View original README</summary>
                    <div className="mt-4"><Markdown>{readme_raw}</Markdown></div>
                  </details>
                )}
              </section>
            </TabsContent>

            <TabsContent value="structure" className="animate-in-soft">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
                <h2 className="font-serif-display text-2xl">Repository structure</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click folders to expand. Short notes explain what each area is for.
                </p>
                <div className="mt-5">
                  <FileTree tree={tree} notes={explanation.structure_notes} />
                </div>
              </section>
            </TabsContent>

            <TabsContent value="files" className="animate-in-soft">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-serif-display text-2xl">Important files</h2>
                    <p className="mt-1 text-sm text-muted-foreground">The files that matter most in this project.</p>
                  </div>
                  <div className="relative w-56">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search explanations"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-9 pl-8"
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {filteredFiles.length === 0 && (
                    <p className="text-sm text-muted-foreground">No files match “{search}”.</p>
                  )}
                  {filteredFiles.map((f) => (
                    <article key={f.path} className="rounded-xl border border-border bg-background/60 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-mono text-sm text-primary">{f.path}</h3>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { navigator.clipboard.writeText(f.explanation_md); toast.success("Copied"); }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{f.purpose}</p>
                      <div className="mt-3"><Markdown>{f.explanation_md}</Markdown></div>
                    </article>
                  ))}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="start" className="animate-in-soft">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
                <h2 className="font-serif-display text-2xl">Start here</h2>
                <p className="mt-1 text-sm text-muted-foreground">A suggested reading order to understand this project.</p>
                <div className="mt-5"><Markdown>{explanation.start_here_md}</Markdown></div>
              </section>
            </TabsContent>

            <TabsContent value="chat" className="animate-in-soft">
              <RepoChat result={result} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
