import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

/* ---------- Rate limiter (shared pattern with chat) ---------- */
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

/* ---------- POST handler ---------- */

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Te veel verzoeken. Wacht even en probeer het opnieuw." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const paragraphId = typeof body.paragraphId === "string" ? body.paragraphId : null;
  const difficulty = typeof body.difficulty === "number" && body.difficulty >= 1 && body.difficulty <= 4
    ? body.difficulty : null;
  const validTypes = ["multiple-choice", "open", "fill-in"];
  const questionType = validTypes.includes(body.questionType) ? body.questionType : "multiple-choice";

  if (!paragraphId || !difficulty) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  // Fetch paragraph context
  const { data: paragraph } = await supabase
    .from("paragraphs")
    .select("title, transcript")
    .eq("id", paragraphId)
    .single();

  if (!paragraph?.transcript) {
    return Response.json(
      { error: "Geen lesstof beschikbaar voor deze paragraaf." },
      { status: 404 }
    );
  }

  const { data: concepts } = await supabase
    .from("concepts")
    .select("term, definition")
    .eq("paragraph_id", paragraphId)
    .order("order");

  const { data: goals } = await supabase
    .from("learning_goals")
    .select("text")
    .eq("paragraph_id", paragraphId)
    .order("order");

  const conceptsText = (concepts || [])
    .map((c) => c.definition ? `- ${c.term}: ${c.definition}` : `- ${c.term}`)
    .join("\n");

  const goalsText = (goals || [])
    .map((g) => `- ${g.text.replace(/\*\*/g, "")}`)
    .join("\n");

  const difficultyDesc: Record<number, string> = {
    1: "Reproductie — simpele kennisvragen, direct uit de lesstof, bijv. definities of feiten herkennen",
    2: "Toepassen — de leerling moet kennis toepassen in een bekende/geoefende situatie",
    3: "Nieuwe situaties — de leerling moet kennis toepassen in een onbekende context of voorbeeld",
    4: "Inzicht — de leerling moet verbanden leggen, redeneren, of kritisch nadenken",
  };

  const systemPrompt = `Je bent een biologiedocent die oefenvragen maakt voor vmbo-havo leerjaar 1.

OPDRACHT: Genereer precies 1 vraag op niveau ${difficulty} (${difficultyDesc[difficulty]}).

PARAGRAAF: "${paragraph.title}"

LEERDOELEN:
${goalsText}

KERNBEGRIPPEN:
${conceptsText}

TRANSCRIPT (samenvatting lesstof):
${paragraph.transcript.slice(0, 3000)}

REGELS:
- De vraag MOET gebaseerd zijn op bovenstaande lesstof
- Maak een vraag van type "${questionType}"
- Bij multiple-choice: geef precies 4 KORTE opties (max 15 woorden per optie), waarvan 1 correct. Maak de foute opties geloofwaardig. Gebruik GEEN "A.", "B." etc. voor de opties. Het "answer" veld moet EXACT overeenkomen met een van de opties.
- Bij fill-in: maak een zin met ... (drie puntjes) waar het antwoord moet komen. Het antwoord moet 1-3 woorden zijn.
- Bij open: stel een vraag waar de leerling in eigen woorden moet antwoorden. Geef een voorbeeldantwoord in het "answer" veld.
- De uitleg moet kort, helder en leerzaam zijn (2-3 zinnen max)
- De feedback moet persoonlijk en bemoedigend zijn, in de stijl van een chille docent

ANTWOORD UITSLUITEND in dit exacte JSON format, zonder markdown codeblocks, op 1 regel:

Voor multiple-choice:
{"type":"multiple-choice","question":"Vraag hier","options":["optie 1","optie 2","optie 3","optie 4"],"answer":"optie 1","explanation":"Uitleg hier","feedbackCorrect":"Goed zo!","feedbackWrong":"Bijna!"}

Voor fill-in:
{"type":"fill-in","question":"Zin met ... erin","answer":"antwoord","explanation":"Uitleg hier","feedbackCorrect":"Goed zo!","feedbackWrong":"Bijna!"}

Voor open:
{"type":"open","question":"Open vraag hier","answer":"Voorbeeldantwoord hier","explanation":"Uitleg hier","feedbackCorrect":"Goed zo!","feedbackWrong":"Bijna!"}`;

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
            { role: "user", content: `Genereer een vraag op niveau ${difficulty} over "${paragraph.title}". Antwoord in JSON.` },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate-question] OpenRouter error:", response.status, errText);
      return Response.json(
        { error: "AI is even niet beschikbaar. Probeer het straks opnieuw." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    console.log("[generate-question] AI response:", content?.slice(0, 200));

    if (!content) {
      console.error("[generate-question] Empty content from AI");
      return Response.json({ error: "Geen vraag ontvangen." }, { status: 500 });
    }

    // Parse JSON — strip possible markdown code fences and extract JSON object
    let cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    // Extract first JSON object if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];

    let question;
    try {
      question = JSON.parse(cleaned);
    } catch {
      // Try to fix common AI JSON issues: unescaped quotes in strings
      try {
        // Fix options array that bleeds into answer field
        const fixedJson = cleaned
          .replace(/,\s*"answer"/g, '],"answer"')
          .replace(/\]\]/g, ']');
        question = JSON.parse(fixedJson);
      } catch (parseErr) {
        console.error("[generate-question] JSON parse error:", parseErr, "Content:", cleaned.slice(0, 500));
        return Response.json({ error: "Ongeldige vraag ontvangen. Probeer het opnieuw." }, { status: 500 });
      }
    }

    // Validate required fields
    if (!question.type || !question.question || !question.answer || !question.explanation) {
      console.error("[generate-question] Missing fields:", JSON.stringify(question));
      return Response.json({ error: "Ongeldige vraag ontvangen." }, { status: 500 });
    }

    return Response.json({ question });
  } catch (err) {
    console.error("[generate-question] Unexpected error:", err);
    return Response.json(
      { error: "Er ging iets mis bij het genereren. Probeer het opnieuw." },
      { status: 500 }
    );
  }
}
