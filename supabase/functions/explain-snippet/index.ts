// Explain a pasted code snippet using Lovable AI (Gemini)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'code'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trim huge pastes to stay within context
    const trimmed = code.length > 20000 ? code.slice(0, 20000) + "\n// …(truncated)" : code;
    const lang = language && language !== "auto" ? language : "(auto-detect)";

    const system = `You are a senior software engineer and patient teacher.
Explain code clearly for a learning programmer. Use simple English.

Output MUST be markdown with these sections, in this order:

## Summary
One short paragraph: what this code does at a high level.

## Step-by-step
A numbered list walking through the code. Reference variable/function names
in backticks. Explain the *why*, not just the *what*.

## Key concepts
Bullet list of programming concepts used (e.g., closures, async/await, recursion).

## Gotchas & notes
Edge cases, pitfalls, or improvement suggestions. If none, say "Looks clean."

Keep it concise but thorough. No filler.`;

    const user = `Language: ${lang}\n\nCode:\n\`\`\`\n${trimmed}\n\`\`\``;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable Cloud." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${res.status}: ${txt}`);
    }

    const data = await res.json();
    const explanation_md = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ explanation_md }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
