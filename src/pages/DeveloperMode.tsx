import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, Award, BookText, Copy, ExternalLink, Github, Lightbulb,
  Loader2, Search, Sparkles, Star, Tag, TrendingUp, User, Zap, GitFork, FileCode2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/Markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Suggestion = {
  title: string;
  category: string;
  impact: "low" | "medium" | "high";
  detail_md: string;
};

type Insights = {
  target_kind: "profile" | "repo";
  headline: string;
  profile_analysis?: {
    consistency_md: string;
    quality_overview_md: string;
    strengths: string[];
    weaknesses: string[];
    detected_stack: string[];
    persona: string;
  };
  repo_score: {
    overall: number;
    summary_md: string;
    categories: { name: string; score: number; note: string }[];
  };
  readme_md: string;
  seo: {
    best_title: string;
    improved_description: string;
    tags: string[];
    discoverability_md: string;
  };
  suggestions: Suggestion[];
};

type Result = {
  kind: "profile" | "repo";
  context: any;
  insights: Insights;
};

const LOADING_STEPS = [
  "Pinging GitHub API…",
  "Crunching repos & languages…",
  "Scoring quality signals…",
  "Generating README & insights…",
];

const EXAMPLES = ["torvalds", "vercel/next.js", "facebook/react", "octocat"];

const DeveloperMode = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const run = async (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setLoading(true);
    setResult(null);
    setStep(0);

    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1400);

    try {
      const { data, error } = await supabase.functions.invoke("developer-mode", {
        body: { input: v },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const copy = async (text: string, label = "Copied") => {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-grid bg-grid-fade opacity-40" />
      <div className="relative">
        {/* Developer mode badge in top-left */}
        <div className="fixed left-4 top-4 z-40 flex items-center gap-2 rounded-full border border-primary/60 bg-primary/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]">
          <Star className="h-3 w-3 fill-current animate-pulse" />
          developer mode
        </div>

        <SiteHeader />

        <main className="mx-auto max-w-6xl px-4 py-10">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative text-center"
          >
            {/* glow halo */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />

            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]">
              <Star className="h-3 w-3 fill-current" />
              developer mode
              <span className="text-primary/50">·</span>
              <span className="text-primary/80">v1.0</span>
            </div>

            <h1 className="font-mono text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              <span className="text-muted-foreground">{"// "}</span>
              X-Ray Profiles.
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Refine Repositories.
              </span>{" "}
              Repeat.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground md:text-base">
              Your personal GitHub mentor — scoring profiles, fixing READMEs,
              boosting discoverability, and shipping actionable next steps.
            </p>

            {/* command hint */}
            <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground shadow-soft">
              <span className="text-primary">$</span>
              <span>repoxray</span>
              <span className="text-primary/70">--mode</span>
              <span className="text-foreground">developer</span>
              <span className="caret" />
            </div>
          </motion.div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); run(input); }}
            className="mx-auto mt-10 max-w-2xl"
          >
            <div className="group relative">
              {/* glow ring */}
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/40 via-primary/10 to-primary/40 opacity-60 blur transition-opacity group-focus-within:opacity-100" />
              <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft transition-all focus-within:border-primary">
                <div className="flex items-center gap-2 pl-3 font-mono text-xs text-primary">
                  <Github className="h-4 w-4" />
                  <span className="hidden text-muted-foreground sm:inline">~/gh</span>
                  <span className="text-primary">$</span>
                </div>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="username  or  owner/repo  or  github.com/owner/repo"
                  className="flex-1 border-0 bg-transparent font-mono text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading} className="h-10 gap-1.5 font-mono">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "analyzing" : "x-ray it"}
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">$ try</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { setInput(ex); run(ex); }}
                  disabled={loading}
                  className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-foreground/80 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary hover:shadow-[0_4px_12px_-6px_hsl(var(--primary)/0.5)] disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </form>

          {/* Loading */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto mt-10 max-w-2xl rounded-xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="font-mono text-xs text-primary">$ repoxray --analyze</div>
              <div className="mt-4 space-y-2.5">
                {LOADING_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      "flex items-center gap-3 font-mono text-sm transition-opacity",
                      i > step && "opacity-30",
                    )}
                  >
                    {i < step && <span className="text-primary">✓</span>}
                    {i === step && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    {i > step && <span className="text-muted-foreground">○</span>}
                    <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Result */}
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-12"
            >
              <ResultView result={result} onCopy={copy} />
            </motion.div>
          )}

          {!result && !loading && (
            <FeatureGrid />
          )}
        </main>
      </div>
    </div>
  );
};

function FeatureGrid() {
  const features = [
    { icon: User, title: "Profile Analyzer", desc: "Consistency, strengths, weaknesses & detected stack." },
    { icon: Award, title: "Repo Score", desc: "0-100 score with category-by-category breakdown." },
    { icon: BookText, title: "README Generator", desc: "Professional, copy-paste-ready GitHub markdown." },
    { icon: Tag, title: "SEO Optimizer", desc: "Better title, description & discoverability tags." },
    { icon: Lightbulb, title: "Smart Suggestions", desc: "Prioritized, actionable improvements you can ship today." },
    { icon: Zap, title: "Powered by AI", desc: "Structured insights from live GitHub data." },
  ];
  return (
    <div className="mx-auto mt-20 max-w-5xl">
      <div className="mb-6 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="h-px w-12 bg-border" />
        <span>$ ls ./features</span>
        <span className="h-px w-12 bg-border" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          const num = String(i + 1).padStart(2, "0");
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_12px_32px_-16px_hsl(var(--primary)/0.5)]"
            >
              <span className="absolute right-3 top-3 font-mono text-[10px] text-muted-foreground/60">
                {num}
              </span>
              <span className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary transition-all group-hover:border-primary/40 group-hover:bg-primary/20 group-hover:shadow-[0_0_16px_hsl(var(--primary)/0.4)]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-mono text-sm font-semibold">{f.title}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ResultView({ result, onCopy }: { result: Result; onCopy: (t: string, l?: string) => void }) {
  const { insights, kind, context } = result;
  const isProfile = kind === "profile";
  const score = Math.round(insights.repo_score.overall);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-transparent p-6">
          <div className="flex flex-wrap items-start gap-4">
            {isProfile ? (
              <img
                src={context.user.avatar_url}
                alt={context.user.login}
                className="h-16 w-16 rounded-xl ring-1 ring-border"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-border">
                <FileCode2 className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs text-muted-foreground">
                {isProfile ? "@" + context.user.login : context.repo.full_name}
              </div>
              <h2 className="mt-0.5 font-mono text-2xl font-semibold tracking-tight">
                {isProfile ? (context.user.name || context.user.login) : context.repo.name}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-foreground/85">{insights.headline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {isProfile ? (
                  <>
                    <Stat icon={User} label={`${context.user.followers} followers`} />
                    <Stat icon={Github} label={`${context.user.public_repos} repos`} />
                    <Stat icon={Star} label={`${context.stats.totalStars} ★`} />
                    <Stat icon={Activity} label={`${context.stats.activeDays30} active days (last 100 events)`} />
                  </>
                ) : (
                  <>
                    <Stat icon={Star} label={`${context.repo.stars} ★`} />
                    <Stat icon={GitFork} label={`${context.repo.forks} forks`} />
                    {context.repo.language && <Stat icon={FileCode2} label={context.repo.language} />}
                    {context.repo.license && <Stat icon={Award} label={context.repo.license} />}
                  </>
                )}
              </div>
            </div>
            <a
              href={isProfile ? context.user.html_url : context.repo.html_url}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> GitHub
              </Button>
            </a>
          </div>
        </div>

        {/* Score bar */}
        <div className="grid gap-4 p-6 md:grid-cols-[200px_1fr] md:items-center">
          <ScoreRing value={score} />
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold">Overall Score</h3>
              <Badge
                className={cn(
                  "border-0 font-mono",
                  score >= 80 ? "bg-primary/20 text-primary"
                    : score >= 60 ? "bg-amber-500/20 text-amber-400"
                      : "bg-rose-500/20 text-rose-400",
                )}
              >
                {score >= 80 ? "Excellent" : score >= 60 ? "Solid" : "Needs work"}
              </Badge>
            </div>
            <Progress value={score} className="mt-2 h-2" />
            <div className="mt-3 text-sm text-muted-foreground">
              <Markdown>{insights.repo_score.summary_md}</Markdown>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-card p-1">
          <TabsTrigger value="overview" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Overview</TabsTrigger>
          {isProfile && (
            <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
          )}
          <TabsTrigger value="score" className="gap-1.5"><Award className="h-3.5 w-3.5" />Score</TabsTrigger>
          <TabsTrigger value="readme" className="gap-1.5"><BookText className="h-3.5 w-3.5" />README</TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5"><Tag className="h-3.5 w-3.5" />SEO</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Suggestions</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Top Suggestions" icon={Lightbulb}>
              <ul className="space-y-2.5">
                {insights.suggestions.slice(0, 4).map((s) => (
                  <li key={s.title} className="flex items-start gap-2.5">
                    <ImpactDot impact={s.impact} />
                    <div>
                      <div className="font-mono text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.category}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Score Breakdown" icon={Award}>
              <div className="space-y-3">
                {insights.repo_score.categories.map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-foreground/85">{c.name}</span>
                      <span className="text-primary">{Math.round(c.score)}/100</span>
                    </div>
                    <Progress value={c.score} className="mt-1 h-1.5" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {isProfile && insights.profile_analysis && (
            <Card title="Persona" icon={User}>
              <div className="font-mono text-sm text-primary">{insights.profile_analysis.persona}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {insights.profile_analysis.detected_stack.map((t) => (
                  <Badge key={t} variant="outline" className="border-border/80 font-normal">{t}</Badge>
                ))}
              </div>
            </Card>
          )}

          {!isProfile && (
            <Card title="Repository Topics" icon={Tag}>
              <div className="flex flex-wrap gap-1.5">
                {(context.repo.topics?.length ? context.repo.topics : ["no topics yet"]).map((t: string) => (
                  <Badge key={t} variant="outline" className="border-border/80 font-normal">{t}</Badge>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Profile only */}
        {isProfile && insights.profile_analysis && (
          <TabsContent value="profile" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Contribution Consistency" icon={Activity}>
                <Markdown>{insights.profile_analysis.consistency_md}</Markdown>
              </Card>
              <Card title="Repo Quality Overview" icon={TrendingUp}>
                <Markdown>{insights.profile_analysis.quality_overview_md}</Markdown>
              </Card>
              <Card title="Strengths" icon={Sparkles}>
                <ul className="space-y-2">
                  {insights.profile_analysis.strengths.map((s) => (
                    <li key={s} className="flex gap-2 text-sm">
                      <span className="text-primary">+</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Weaknesses" icon={Search}>
                <ul className="space-y-2">
                  {insights.profile_analysis.weaknesses.map((s) => (
                    <li key={s} className="flex gap-2 text-sm">
                      <span className="text-rose-400">−</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {context.topRepos?.length > 0 && (
              <Card title="Top Repositories" icon={Star}>
                <div className="grid gap-2 md:grid-cols-2">
                  {context.topRepos.map((r: any) => (
                    <a
                      key={r.name}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border bg-background/40 p-3 transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm font-medium text-primary">{r.name}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" /> {r.stars}
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {r.description || "No description"}
                      </p>
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Score */}
        <TabsContent value="score" className="mt-4">
          <Card title="Detailed Score Breakdown" icon={Award}>
            <div className="space-y-4">
              {insights.repo_score.categories.map((c) => (
                <div key={c.name} className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-mono text-sm font-semibold">{c.name}</h4>
                    <span className="font-mono text-sm text-primary">{Math.round(c.score)}/100</span>
                  </div>
                  <Progress value={c.score} className="mt-2 h-2" />
                  <p className="mt-2.5 text-sm text-muted-foreground">{c.note}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* README */}
        <TabsContent value="readme" className="mt-4">
          <Card
            title="Generated README"
            icon={BookText}
            action={
              <Button size="sm" variant="outline" onClick={() => onCopy(insights.readme_md, "README copied")}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy markdown
              </Button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <pre className="max-h-[600px] overflow-auto rounded-lg border border-border bg-[hsl(var(--terminal-bg))] p-4 text-xs leading-relaxed text-[hsl(var(--terminal-fg))]">
                {insights.readme_md}
              </pre>
              <div className="max-h-[600px] overflow-auto rounded-lg border border-border bg-background/40 p-4">
                <Markdown>{insights.readme_md}</Markdown>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card
              title="Best Title"
              icon={Tag}
              action={<CopyBtn text={insights.seo.best_title} onCopy={onCopy} />}
            >
              <p className="font-mono text-sm text-primary">{insights.seo.best_title}</p>
            </Card>
            <Card
              title="Improved Description"
              icon={BookText}
              action={<CopyBtn text={insights.seo.improved_description} onCopy={onCopy} />}
            >
              <p className="text-sm text-foreground/85">{insights.seo.improved_description}</p>
            </Card>
          </div>
          <Card
            title="Recommended Tags"
            icon={Tag}
            action={<CopyBtn text={insights.seo.tags.join(", ")} onCopy={onCopy} label="Tags copied" />}
          >
            <div className="flex flex-wrap gap-1.5">
              {insights.seo.tags.map((t) => (
                <Badge key={t} className="border-0 bg-primary/15 font-mono font-normal text-primary">
                  {t}
                </Badge>
              ))}
            </div>
          </Card>
          <Card title="Discoverability Notes" icon={TrendingUp}>
            <Markdown>{insights.seo.discoverability_md}</Markdown>
          </Card>
        </TabsContent>

        {/* Suggestions */}
        <TabsContent value="suggestions" className="mt-4">
          <div className="space-y-3">
            {insights.suggestions.map((s, i) => (
              <motion.div
                key={s.title + i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <ImpactDot impact={s.impact} />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-mono text-sm font-semibold">{s.title}</h4>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{s.category}</span>
                      <span>·</span>
                      <span className={cn(
                        "uppercase tracking-wider",
                        s.impact === "high" && "text-primary",
                        s.impact === "medium" && "text-amber-400",
                      )}>{s.impact} impact</span>
                    </div>
                  </div>
                  <CopyBtn text={s.detail_md} onCopy={onCopy} />
                </div>
                <div className="mt-3 border-t border-border pt-3 text-sm">
                  <Markdown>{s.detail_md}</Markdown>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function Card({
  title, icon: Icon, action, children,
}: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-mono text-sm font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function CopyBtn({ text, onCopy, label }: { text: string; onCopy: (t: string, l?: string) => void; label?: string }) {
  return (
    <Button size="sm" variant="ghost" onClick={() => onCopy(text, label)}>
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

function Stat({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function ImpactDot({ impact }: { impact: "low" | "medium" | "high" }) {
  const cls =
    impact === "high" ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]"
      : impact === "medium" ? "bg-amber-400"
        : "bg-muted-foreground";
  return <span className={cn("mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full", cls)} />;
}

function ScoreRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 80 ? "hsl(var(--primary))" : value >= 60 ? "hsl(45 90% 55%)" : "hsl(0 70% 60%)";
  return (
    <div className="relative mx-auto h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="hsl(var(--border))" strokeWidth="8" fill="none" />
        <motion.circle
          cx="60" cy="60" r={r}
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-mono text-3xl font-bold">{value}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</div>
        </div>
      </div>
    </div>
  );
}

export default DeveloperMode;
