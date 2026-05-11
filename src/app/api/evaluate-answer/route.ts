import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isRateLimited } from "@/lib/rate-limit";
import { AI_MODEL, AI_SETTINGS, RATE_LIMITS, requireApiKey, logUsage } from "@/lib/ai-config";

export async function POST(req: NextRequest) {
  // API key check
  let apiKey: string;
  try { apiKey = requireApiKey(); } catch {
    return Response.json({ error: "AI is niet geconfigureerd." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip, "evaluate", RATE_LIMITS.evaluate.limit, RATE_LIMITS.evaluate.windowMs)) {
    return Response.json(
      { error: "Te veel verzoeken. Wacht even." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const question = typeof body.question === "string" ? body.question.slice(0, 500) : null;
  const correctAnswer = typeof body.correctAnswer === "string" ? body.correctAnswer.slice(0, 500) : null;
  const studentAnswer = typeof body.studentAnswer === "string" ? body.studentAnswer.slice(0, 1000) : null;
  const paragraphId = typeof body.paragraphId === "string" ? body.paragraphId : null;

  if (!question || !correctAnswer || !studentAnswer) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  // Fetch lesson context for better evaluation
  let lessonContext = "";
  if (paragraphId) {
    const { data: paragraph } = await supabaseServer
      .from("paragraphs")
      .select("title, transcript")
      .eq("id", paragraphId)
      .single();

    const { data: concepts } = await supabaseServer
      .from("concepts")
      .select("term, definition")
      .eq("paragraph_id", paragraphId)
      .order("order");

    if (paragraph?.transcript) {
      const conceptsText = (concepts || [])
        .map((c) => c.definition ? `${c.term}: ${c.definition}` : c.term)
        .join("; ");

      lessonContext = `\nLESSTOF CONTEXT (gebruik dit om te beoordelen of het antwoord inhoudelijk klopt):\nParagraaf: "${paragraph.title}"\nKernbegrippen: ${conceptsText}\nSamenvatting lesstof: ${paragraph.transcript.slice(0, 1500)}`;
    }
  }

  // System prompt bevat alleen instructies — geen user input
  const systemPrompt = `Je bent een biologiedocent die het antwoord van een vmbo-havo leerling beoordeelt.
${lessonContext}

Beoordeel het antwoord van de leerling. Geef je antwoord UITSLUITEND als JSON:
{"score":"goed"|"deels"|"fout","feedback":"Persoonlijke feedback, max 2 zinnen. Wees bemoedigend en chill, gebruik af en toe een woord als 'bro' of 'nice' maar overdrijf niet.","tip":"Als het antwoord niet perfect is, geef een korte tip wat er mist of beter kan. Anders laat leeg."}

Regels:
- "goed" = alle belangrijke punten genoemd. Het antwoord hoeft NIET woordelijk hetzelfde te zijn als het voorbeeldantwoord — als de leerling hetzelfde bedoelt in eigen woorden is het ook goed.
- "deels" = sommige punten goed, maar er mist iets belangrijks
- "fout" = het antwoord klopt inhoudelijk niet of slaat nergens op
- Gebruik de lesstof context om te controleren of het antwoord van de leerling klopt, ook als het anders verwoord is dan het voorbeeldantwoord
- Wees eerlijk maar altijd bemoedigend
- Feedback in het Nederlands met wat straattaal`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          temperature: AI_SETTINGS.evaluate.temperature,
          max_tokens: AI_SETTINGS.evaluate.max_tokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            // User input in apart message — voorkomt prompt injection via system prompt
            {
              role: "user",
              content: `VRAAG: ${question}\nVOORBEELDANTWOORD: ${correctAnswer}\nANTWOORD VAN DE LEERLING: ${studentAnswer}\n\nBeoordeel dit antwoord.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("[evaluate-answer] OpenRouter error:", response.status);
      return Response.json(
        { error: "AI is even niet beschikbaar." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return Response.json({ error: "Geen beoordeling ontvangen." }, { status: 500 });
    }

    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    let evaluation;
    try {
      evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch (parseErr) {
      console.error("[evaluate-answer] JSON parse error:", parseErr, "Content:", cleaned.slice(0, 300));
      return Response.json({ error: "Ongeldige beoordeling ontvangen. Probeer het opnieuw." }, { status: 500 });
    }

    // Validate required fields
    if (!evaluation.score || !evaluation.feedback) {
      console.error("[evaluate-answer] Missing fields:", JSON.stringify(evaluation));
      return Response.json({ error: "Ongeldige beoordeling ontvangen." }, { status: 500 });
    }

    // Fire-and-forget analytics
    logUsage(supabaseServer, {
      route: "evaluate",
      paragraph_id: paragraphId || "",
      score: evaluation.score,
    });

    return Response.json({ evaluation });
  } catch (err) {
    console.error("[evaluate-answer] Unexpected error:", err);
    return Response.json(
      { error: "Beoordeling mislukt." },
      { status: 500 }
    );
  }
}
