import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

/* ---------- Rate limiter ---------- */
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Te veel verzoeken. Wacht even." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const question = typeof body.question === "string" ? body.question : null;
  const correctAnswer = typeof body.correctAnswer === "string" ? body.correctAnswer : null;
  const studentAnswer = typeof body.studentAnswer === "string" ? body.studentAnswer : null;
  const paragraphId = typeof body.paragraphId === "string" ? body.paragraphId : null;

  if (!question || !correctAnswer || !studentAnswer) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  // Fetch lesson context for better evaluation
  let lessonContext = "";
  if (paragraphId) {
    const { data: paragraph } = await supabase
      .from("paragraphs")
      .select("title, transcript")
      .eq("id", paragraphId)
      .single();

    const { data: concepts } = await supabase
      .from("concepts")
      .select("term, definition")
      .eq("paragraph_id", paragraphId)
      .order("order");

    if (paragraph?.transcript) {
      const conceptsText = (concepts || [])
        .map((c) => c.definition ? `${c.term}: ${c.definition}` : c.term)
        .join("; ");

      lessonContext = `
LESSTOF CONTEXT (gebruik dit om te beoordelen of het antwoord inhoudelijk klopt):
Paragraaf: "${paragraph.title}"
Kernbegrippen: ${conceptsText}
Samenvatting lesstof: ${paragraph.transcript.slice(0, 1500)}`;
    }
  }

  const systemPrompt = `Je bent een biologiedocent die het antwoord van een vmbo-havo leerling beoordeelt.

VRAAG: "${question}"
VOORBEELDANTWOORD: "${correctAnswer}"
ANTWOORD VAN DE LEERLING: "${studentAnswer}"
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
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Beoordeel dit antwoord." },
          ],
        }),
      }
    );

    if (!response.ok) {
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
    const evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    return Response.json({ evaluation });
  } catch {
    return Response.json(
      { error: "Beoordeling mislukt." },
      { status: 500 }
    );
  }
}
