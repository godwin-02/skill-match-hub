// ATS scoring with Lovable AI Gateway.
// Input: { resume_text, job: { title, description, required_skills, preferred_roles, experience_level } }
// Output: { ats_score, missing_skills, matched_skills, suggestions, summary }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const resumeText = String(body?.resume_text ?? "").slice(0, 18000);
    const job = body?.job ?? {};
    if (!resumeText || !job?.title) {
      return new Response(JSON.stringify({ error: "resume_text and job are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) and technical recruiter.
Given a candidate's resume text and a job posting, return a strict JSON evaluation via the provided tool.
Be objective. Score 0–100. Penalize missing must-have skills heavily.`;

    const userPrompt = `JOB TITLE: ${job.title}
EXPERIENCE LEVEL: ${job.experience_level ?? "entry"}
REQUIRED SKILLS: ${(job.required_skills ?? []).join(", ") || "(none specified)"}
PREFERRED ROLES: ${(job.preferred_roles ?? []).join(", ") || "(none)"}
JOB DESCRIPTION:
${String(job.description ?? "").slice(0, 4000)}

CANDIDATE RESUME (raw text):
${resumeText}

Evaluate the fit and call the function "submit_ats_evaluation".`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "submit_ats_evaluation",
              description: "Return ATS evaluation for the candidate vs job.",
              parameters: {
                type: "object",
                properties: {
                  ats_score: { type: "integer", description: "Overall ATS score 0-100" },
                  matched_skills: { type: "array", items: { type: "string" } },
                  missing_skills: { type: "array", items: { type: "string" } },
                  suggestions: { type: "string", description: "1-3 short, actionable bullet-style tips for the candidate" },
                  summary: { type: "string", description: "One-sentence verdict" },
                },
                required: ["ats_score", "matched_skills", "missing_skills", "suggestions", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_ats_evaluation" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    const ats_score = Math.max(0, Math.min(100, Math.round(Number(args.ats_score) || 0)));

    return new Response(
      JSON.stringify({
        ats_score,
        matched_skills: args.matched_skills ?? [],
        missing_skills: args.missing_skills ?? [],
        suggestions: args.suggestions ?? "",
        summary: args.summary ?? "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ats-score error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
