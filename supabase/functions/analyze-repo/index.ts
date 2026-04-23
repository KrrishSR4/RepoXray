// Analyze a GitHub repo: fetch metadata, tree, README, key files, then ask Lovable AI
// to produce structured explanations (overview, structure notes, file explanations, start-here guide).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  try {
    const cleaned = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
    const m = cleaned.match(/github\.com[:/]+([^/]+)\/([^/?#]+)/i);
    if (!m) return null;
    return { owner: m[1], repo: m[2] };
  } catch {
    return null;
  }
}

async function gh(path: string, token?: string) {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "CodeExplainPro",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} on ${path}: ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

async function ghRaw(url: string, token?: string): Promise<string> {
  const headers: Record<string, string> = { "User-Agent": "CodeExplainPro" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return "";
  return res.text();
}

const IMPORTANT_PATTERNS = [
  /^package\.json$/i,
  /^pyproject\.toml$/i,
  /^requirements\.txt$/i,
  /^Cargo\.toml$/i,
  /^go\.mod$/i,
  /^composer\.json$/i,
  /^Gemfile$/i,
  /^next\.config\.(ts|js|mjs)$/i,
  /^vite\.config\.(ts|js)$/i,
  /^tsconfig\.json$/i,
  /^tailwind\.config\.(ts|js)$/i,
  /^src\/(main|index|App)\.(t|j)sx?$/i,
  /^(app|src)\/(page|layout|routes?)\.(t|j)sx?$/i,
  /^server\/(index|main)\.(t|j)s$/i,
  /^main\.(py|go|rs)$/i,
  /^manage\.py$/i,
  /Dockerfile$/i,
  /docker-compose\.ya?ml$/i,
  /^README\.(md|rst|txt)$/i,
];

function scoreFile(path: string): number {
  let s = 0;
  const depth = path.split("/").length;
  s -= depth;
  if (IMPORTANT_PATTERNS.some((r) => r.test(path))) s += 20;
  if (/^src\//i.test(path)) s += 3;
  if (/\.(tsx?|jsx?|py|go|rs|rb|java|php)$/i.test(path)) s += 2;
  if (/test|spec|__tests__/i.test(path)) s -= 3;
  if (/node_modules|dist|build|\.lock$/i.test(path)) s -= 50;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'url'." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseRepoUrl(url);
    if (!parsed) {
      return new Response(JSON.stringify({ error: "That doesn't look like a GitHub repository URL." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { owner, repo } = parsed;

    const GH_TOKEN = Deno.env.get("GITHUB_TOKEN") || undefined;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 1. Repo metadata
    const meta = await gh(`/repos/${owner}/${repo}`, GH_TOKEN);
    const defaultBranch = meta.default_branch || "main";

    // 2. Tree (recursive)
    const treeData = await gh(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, GH_TOKEN);
    const allEntries: { path: string; type: string; size?: number }[] =
      (treeData.tree || []).map((t: { path: string; type: string; size?: number }) =>
        ({ path: t.path, type: t.type, size: t.size }));

    // Filter out noise for LLM + UI tree
    const filtered = allEntries.filter((e) =>
      !/(^|\/)(node_modules|dist|build|\.git|\.next|target|vendor|__pycache__)(\/|$)/.test(e.path)
      && !/\.(lock|lockb|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|mp4|mp3|pdf)$/i.test(e.path)
    );

    // 3. README
    let readme = "";
    try {
      readme = await ghRaw(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/README.md`,
        GH_TOKEN,
      );
      if (!readme) {
        readme = await ghRaw(
          `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/readme.md`,
          GH_TOKEN,
        );
      }
    } catch { /* ignore */ }

    // 4. Pick important files + fetch snippets
    const files = filtered.filter((e) => e.type === "blob");
    const ranked = files
      .map((f) => ({ ...f, score: scoreFile(f.path) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const fileSnippets: { path: string; snippet: string }[] = [];
    for (const f of ranked) {
      if ((f.size ?? 0) > 60_000) { fileSnippets.push({ path: f.path, snippet: "(file too large to preview)" }); continue; }
      const content = await ghRaw(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${f.path}`,
        GH_TOKEN,
      );
      fileSnippets.push({ path: f.path, snippet: content.slice(0, 6000) });
    }

    // 5. Build compact tree listing for the LLM
    const treePreview = filtered
      .slice(0, 400)
      .map((e) => `${e.type === "tree" ? "DIR " : "FILE"}  ${e.path}`)
      .join("\n");

    // 6. Call Lovable AI with a strict JSON tool
    const systemPrompt =
      "You are a warm, patient coding tutor for beginners. Explain GitHub repositories in plain, friendly language. Avoid jargon unless you define it. Be accurate — only state what the provided data supports.";

    const userPrompt = `
Repository: ${owner}/${repo}
Description: ${meta.description || "(none)"}
Primary language: ${meta.language || "unknown"}
Topics: ${(meta.topics || []).join(", ") || "(none)"}
Stars: ${meta.stargazers_count} · Forks: ${meta.forks_count}
Default branch: ${defaultBranch}

README (truncated):
${(readme || "(no README)").slice(0, 8000)}

File tree (truncated):
${treePreview}

Important file snippets (truncated):
${fileSnippets.map((f) => `--- ${f.path} ---\n${f.snippet}`).join("\n\n").slice(0, 25000)}

Produce a structured beginner-friendly explanation using the provided tool.`;

    const tool = {
      type: "function",
      function: {
        name: "explain_repo",
        description: "Return a structured, beginner-friendly explanation of the repository.",
        parameters: {
          type: "object",
          properties: {
            tagline: { type: "string", description: "One-sentence summary in plain language." },
            overview_md: { type: "string", description: "Markdown: what the repo does, the problem it solves, key features, and who should use it. Friendly tone, ~250 words." },
            complexity: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
            key_concepts: {
              type: "array",
              items: { type: "string" },
              description: "Short labels like 'Authentication', 'REST API', 'State Management'.",
            },
            tech_stack: { type: "array", items: { type: "string" } },
            structure_notes: {
              type: "array",
              description: "Short notes about specific folders/files in the tree.",
              items: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  note: { type: "string", description: "One-sentence plain-language explanation." },
                },
                required: ["path", "note"],
                additionalProperties: false,
              },
            },
            important_files: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  purpose: { type: "string", description: "One sentence: what this file is for." },
                  explanation_md: { type: "string", description: "Markdown: what it does, key functions/components, and why it exists. ~150 words." },
                },
                required: ["path", "purpose", "explanation_md"],
                additionalProperties: false,
              },
            },
            start_here_md: { type: "string", description: "Markdown: a numbered step-by-step beginner learning path — where to read first, which files to open next, and concepts to learn in order." },
          },
          required: [
            "tagline", "overview_md", "complexity", "key_concepts",
            "tech_stack", "structure_notes", "important_files", "start_here_md",
          ],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "explain_repo" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Lovable Cloud settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI service error." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return a tool call.");
    const explanation = JSON.parse(call.function.arguments);

    const result = {
      repo: {
        owner, name: repo,
        full_name: meta.full_name,
        description: meta.description,
        html_url: meta.html_url,
        default_branch: defaultBranch,
        language: meta.language,
        stars: meta.stargazers_count,
        forks: meta.forks_count,
        topics: meta.topics || [],
      },
      tree: filtered, // for interactive UI tree
      readme_raw: readme || "",
      explanation,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-repo error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
