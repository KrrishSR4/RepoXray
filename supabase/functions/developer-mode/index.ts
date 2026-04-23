// Developer Mode — analyzes a GitHub profile or single repo and returns
// structured insights: profile analysis, repo score, README, SEO, suggestions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GITHUB_API = "https://api.github.com";

function ghHeaders() {
  const token = Deno.env.get("GITHUB_TOKEN");
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RepoXray-DeveloperMode",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${GITHUB_API}${path}`, { headers: ghHeaders() });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function parseInput(input: string): {
  type: "profile" | "repo";
  owner: string;
  repo?: string;
} | null {
  const cleaned = input.trim().replace(/\.git$/, "");
  // full URL repo
  const repoUrl = cleaned.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
  if (repoUrl) return { type: "repo", owner: repoUrl[1], repo: repoUrl[2] };
  // profile URL
  const profUrl = cleaned.match(/github\.com\/([^/\s?#]+)\/?$/i);
  if (profUrl) return { type: "profile", owner: profUrl[1] };
  // owner/repo shorthand
  const short = cleaned.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { type: "repo", owner: short[1], repo: short[2] };
  // just username
  const user = cleaned.match(/^@?([\w-]+)$/);
  if (user) return { type: "profile", owner: user[1] };
  return null;
}

async function fetchProfileData(owner: string) {
  const user = await gh<any>(`/users/${owner}`);
  if (!user) throw new Error("GitHub user not found");
  const repos = await gh<any[]>(
    `/users/${owner}/repos?per_page=100&sort=updated`,
  ) ?? [];
  const events = await gh<any[]>(`/users/${owner}/events/public?per_page=100`) ?? [];

  const langs: Record<string, number> = {};
  let totalStars = 0;
  let totalForks = 0;
  let withDescription = 0;
  let withReadmeLikely = 0;
  for (const r of repos) {
    if (r.language) langs[r.language] = (langs[r.language] || 0) + 1;
    totalStars += r.stargazers_count || 0;
    totalForks += r.forks_count || 0;
    if (r.description) withDescription++;
    if (r.size > 0) withReadmeLikely++;
  }
  const topLangs = Object.entries(langs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);

  // contribution consistency from public events (rough)
  const days = new Set<string>();
  for (const e of events) {
    if (e.created_at) days.add(String(e.created_at).slice(0, 10));
  }
  const activeDays30 = days.size;

  const topRepos = [...repos]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 6)
    .map((r) => ({
      name: r.name,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      description: r.description,
      url: r.html_url,
      updated_at: r.updated_at,
    }));

  return {
    user: {
      login: user.login,
      name: user.name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      followers: user.followers,
      following: user.following,
      public_repos: user.public_repos,
      created_at: user.created_at,
      company: user.company,
      location: user.location,
      blog: user.blog,
    },
    stats: {
      totalStars,
      totalForks,
      withDescription,
      withReadmeLikely,
      activeDays30,
      repoCount: repos.length,
    },
    topLangs,
    topRepos,
  };
}

async function fetchRepoData(owner: string, repo: string) {
  const r = await gh<any>(`/repos/${owner}/${repo}`);
  if (!r) throw new Error("Repository not found");
  const langs = (await gh<Record<string, number>>(`/repos/${owner}/${repo}/languages`)) ?? {};
  let readme = "";
  try {
    const rd = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
      headers: { ...ghHeaders(), Accept: "application/vnd.github.raw" },
    });
    if (rd.ok) readme = (await rd.text()).slice(0, 8000);
  } catch { /* ignore */ }

  // top-level tree
  let topTree: string[] = [];
  try {
    const tree = await gh<any>(`/repos/${owner}/${repo}/contents`);
    if (Array.isArray(tree)) topTree = tree.map((t) => `${t.type === "dir" ? "📁" : "📄"} ${t.name}`);
  } catch { /* ignore */ }

  return {
    repo: {
      full_name: r.full_name,
      name: r.name,
      owner: r.owner?.login,
      description: r.description,
      html_url: r.html_url,
      homepage: r.homepage,
      stars: r.stargazers_count,
      forks: r.forks_count,
      watchers: r.subscribers_count,
      open_issues: r.open_issues_count,
      language: r.language,
      license: r.license?.spdx_id ?? null,
      topics: r.topics ?? [],
      default_branch: r.default_branch,
      created_at: r.created_at,
      updated_at: r.updated_at,
      pushed_at: r.pushed_at,
      size: r.size,
      has_wiki: r.has_wiki,
      has_issues: r.has_issues,
      archived: r.archived,
    },
    languages: langs,
    readme,
    topTree,
  };
}

const SYSTEM_PROMPT = `You are RepoXray Developer Mode — an expert GitHub mentor.
You receive structured JSON about a GitHub profile OR a single repository,
and you MUST return a single tool call with a complete analysis.
Be specific, actionable, kind but honest. Avoid fluff. Use markdown for *_md fields.
For READMEs, output complete, copy-paste ready GitHub markdown including code fences,
shields/badges, install commands, usage examples, and a tech stack section.`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "deliver_developer_insights",
    description: "Return the complete RepoXray Developer Mode analysis.",
    parameters: {
      type: "object",
      properties: {
        target_kind: { type: "string", enum: ["profile", "repo"] },
        headline: { type: "string", description: "One-line punchy summary." },
        profile_analysis: {
          type: "object",
          properties: {
            consistency_md: { type: "string" },
            quality_overview_md: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            detected_stack: { type: "array", items: { type: "string" } },
            persona: { type: "string", description: "e.g. 'Frontend specialist', 'Polyglot tinkerer'." },
          },
          required: [
            "consistency_md", "quality_overview_md", "strengths",
            "weaknesses", "detected_stack", "persona",
          ],
          additionalProperties: false,
        },
        repo_score: {
          type: "object",
          properties: {
            overall: { type: "number", description: "0-100" },
            summary_md: { type: "string" },
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  score: { type: "number" },
                  note: { type: "string" },
                },
                required: ["name", "score", "note"],
                additionalProperties: false,
              },
            },
          },
          required: ["overall", "summary_md", "categories"],
          additionalProperties: false,
        },
        readme_md: {
          type: "string",
          description: "A full, professional README in markdown. Required.",
        },
        seo: {
          type: "object",
          properties: {
            best_title: { type: "string" },
            improved_description: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            discoverability_md: { type: "string" },
          },
          required: ["best_title", "improved_description", "tags", "discoverability_md"],
          additionalProperties: false,
        },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: {
                type: "string",
                enum: ["readme", "structure", "documentation", "naming", "seo", "testing", "ci", "community", "security"],
              },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              detail_md: { type: "string" },
            },
            required: ["title", "category", "impact", "detail_md"],
            additionalProperties: false,
          },
        },
      },
      required: ["target_kind", "headline", "repo_score", "readme_md", "seo", "suggestions"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return new Response(JSON.stringify({ error: "Provide a GitHub username or repo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseInput(input);
    if (!parsed) {
      return new Response(JSON.stringify({ error: "Could not parse input. Try 'octocat' or 'owner/repo'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let context: any;
    if (parsed.type === "repo" && parsed.repo) {
      context = { kind: "repo", data: await fetchRepoData(parsed.owner, parsed.repo) };
    } else {
      context = { kind: "profile", data: await fetchProfileData(parsed.owner) };
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Analyze the following ${context.kind} and return ALL fields.\n\nDATA:\n${JSON.stringify(context.data).slice(0, 18000)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "deliver_developer_insights" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit. Please retry shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return a structured response");
    const insights = JSON.parse(call.function.arguments);

    return new Response(
      JSON.stringify({
        kind: context.kind,
        context: context.data,
        insights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("developer-mode error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
