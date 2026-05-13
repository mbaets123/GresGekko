import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isRateLimited } from "@/lib/rate-limit";
import { AI_MODEL, AI_SETTINGS, TRANSCRIPT_LIMIT, RATE_LIMITS, requireApiKey, logUsage } from "@/lib/ai-config";

/* ---------- POST handler ---------- */

export async function POST(req: NextRequest) {
  // API key check
  let apiKey: string;
  try { apiKey = requireApiKey(); } catch {
    return Response.json({ error: "AI is niet geconfigureerd." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip, "generate", RATE_LIMITS.generate.limit, RATE_LIMITS.generate.windowMs)) {
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
  const previousQuestions: string[] = Array.isArray(body.previousQuestions)
    ? body.previousQuestions.slice(-5).map((q: unknown) => typeof q === "string" ? q.slice(0, 150) : "")
    : [];

  if (!paragraphId || !difficulty) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  // Fetch paragraph context
  const { data: paragraph } = await supabaseServer
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

  // Fetch concepts, goals and source questions in parallel
  const [conceptsRes, goalsRes, dbQuestionsRes] = await Promise.all([
    supabaseServer.from("concepts").select("term, definition").eq("paragraph_id", paragraphId).order("order"),
    supabaseServer.from("learning_goals").select("text").eq("paragraph_id", paragraphId).order("order"),
    supabaseServer.from("questions").select("question, answer, type, options").eq("paragraph_id", paragraphId).eq("difficulty", difficulty),
  ]);

  const concepts = conceptsRes.data;
  const goals = goalsRes.data;
  const { data: dbQuestions } = dbQuestionsRes;

  // Pick a random source question, avoiding ones similar to previousQuestions
  let sourceQuestion: { question: string; answer: string; type: string; options: string[] | null } | null = null;
  if (dbQuestions && dbQuestions.length > 0) {
    const filtered = dbQuestions.filter(
      (q) => !previousQuestions.some((prev) => prev.slice(0, 60) === q.question.slice(0, 60))
    );
    const pool = filtered.length > 0 ? filtered : dbQuestions;
    sourceQuestion = pool[Math.floor(Math.random() * pool.length)];
  }

  const conceptsText = (concepts || [])
    .map((c) => c.definition ? `- ${c.term}: ${c.definition}` : `- ${c.term}`)
    .join("\n");

  const goalsText = (goals || [])
    .map((g) => `- ${g.text.replace(/\*\*/g, "")}`)
    .join("\n");

  const difficultyBlocks: Record<number, string> = {
    1: `NIVEAU 1 — REPRODUCTIE (Je herhaalt wat je hebt geleerd)
De leerling hoeft alleen feiten, definities of kenmerken te herinneren die letterlijk in de lesstof staan.
KENMERKEN: directe kennisvragen, herkenning, benoemen, opsommen.
VOORBEELD: "Wat is de functie van het celmembraan?" of "Noem twee kenmerken van zoogdieren."
NIET DOEN: situaties schetsen of de leerling laten redeneren — dat is niveau 2+.`,

    2: `NIVEAU 2 — TOEPASSING 1 (Je gebruikt de stof in een bekende situatie)
De leerling past geleerde kennis toe in een situatie die lijkt op wat in de les is behandeld.
KENMERKEN: herkenbare context, bekende voorbeelden, toepassen van een geleerde regel.
VOORBEELD: "In de les leerde je dat planten zonlicht nodig hebben voor fotosynthese. Een plant staat op de vensterbank in het zonlicht. Wat maakt deze plant met behulp van zonlicht?"
NIET DOEN: volledig nieuwe situaties bedenken — dat is niveau 3.`,

    3: `NIVEAU 3 — TOEPASSING 2 (Je gebruikt de stof in een nieuwe situatie)
De leerling past kennis toe in een situatie die NIET in de les is behandeld — een nieuw voorbeeld, een ander organisme, een andere context.
KENMERKEN: onbekende context, transfer van kennis, nieuw scenario.
VOORBEELD: "Een duiker ziet diep in de oceaan een vis die licht geeft in het donker. Welk biologisch verschijnsel is dit een voorbeeld van?"
NIET DOEN: alleen feiten vragen (dat is niveau 1) of vragen om verbanden te leggen tussen meerdere concepten (dat is niveau 4).`,

    4: `NIVEAU 4 — INZICHT (Je moet zelf verbanden leggen en nadenken)
De leerling moet ZELF verbanden leggen tussen meerdere concepten, redeneren over oorzaak-gevolg, of kritisch nadenken.
Plaats de vraag in een van deze contexten (ZONDER de context expliciet te benoemen):
- Leefwereldcontext: situatie uit het dagelijks leven van een tiener
- Beroepscontext: situatie vanuit een beroep (arts, boer, dierenarts, laborant, etc.)
- Wetenschappelijke context: een onderzoek, experiment of wetenschappelijke waarneming
KENMERKEN: verbanden leggen, redeneren, vergelijken, verklaren waarom, oorzaak-gevolg.
VOORBEELD: "Een boer merkt dat zijn gewassen minder goed groeien sinds hij een kas heeft gebouwd met groen glas. Verklaar met je kennis over fotosynthese waarom dit kan gebeuren."
NIET DOEN: simpele feitenvragen of directe toepassing — de leerling moet echt nadenken en meerdere begrippen combineren.`,
  };

  const explanationLength = difficulty >= 3
    ? "De uitleg moet helder en leerzaam zijn (3-5 zinnen). Leg het verband uit dat de leerling moest zien."
    : "De uitleg moet kort, helder en leerzaam zijn (2-3 zinnen).";

  const sourceBlock = sourceQuestion
    ? `BASISVRAAG (gebruik dit als inhoudelijke basis, maar maak een VARIATIE):
Vraag: "${sourceQuestion.question}"
Antwoord: "${sourceQuestion.answer}"${sourceQuestion.options ? `\nOpties: ${JSON.stringify(sourceQuestion.options)}` : ""}

VARIATIE-INSTRUCTIES:
- Gebruik hetzelfde leerdoel en hetzelfde biologische concept als de basisvraag
- Verander de context: gebruik een andere naam, situatie, locatie of invalshoek
- Bij multiple-choice: verzin nieuwe foute opties, verander de volgorde van de opties
- Bij open: vraag naar hetzelfde concept maar formuleer de vraag anders
- De variatie moet DUIDELIJK anders zijn dan de basisvraag, maar over exact hetzelfde gaan`
    : `OPDRACHT: Genereer een vraag op basis van de lesstof hieronder.`;

  const systemPrompt = `Je bent een biologiedocent die oefenvragen maakt voor vmbo t - havo leerjaar 1.

${sourceBlock}

NIVEAU:
${difficultyBlocks[difficulty]}

PARAGRAAF: "${paragraph.title}"

LEERDOELEN:
${goalsText}

KERNBEGRIPPEN:
${conceptsText}

TRANSCRIPT (samenvatting lesstof):
${paragraph.transcript.slice(0, TRANSCRIPT_LIMIT)}

REGELS:
- De vraag MOET gebaseerd zijn op de lesstof en (indien aanwezig) de basisvraag
- Maak een vraag van type "${questionType}"
- Houd je STRIKT aan het beschreven niveau. Een niveau 1 vraag mag NOOIT een situatieschets bevatten. Een niveau 4 vraag MOET de leerling laten redeneren over verbanden.${previousQuestions.length > 0 ? `\n- Deze vragen zijn al gesteld, stel GEEN vergelijkbare vraag:\n${previousQuestions.map((q) => `  * "${q}"`).join("\n")}` : ""}
- Bij multiple-choice: geef precies 4 KORTE opties (max 15 woorden per optie), waarvan 1 correct. Baseer de foute opties op veelgemaakte fouten en misconcepties van leerlingen. Gebruik GEEN "A.", "B." etc. Het "answer" veld moet EXACT overeenkomen met een van de opties.
- Bij fill-in: maak een zin met ... (drie puntjes) waar het antwoord moet komen. Het antwoord moet 1-3 woorden zijn. Geef in het "answer" veld het meest gangbare woord (zonder lidwoord).
- Bij open: stel een vraag waar de leerling in eigen woorden moet antwoorden. Geef een volledig voorbeeldantwoord in het "answer" veld.
- ${explanationLength}
- De feedback moet persoonlijk en bemoedigend zijn, chill maar niet overdreven met straattaal. Max 1 straattaalwoord per feedback.

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
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          temperature: AI_SETTINGS.generate.temperature,
          max_tokens: AI_SETTINGS.generate.max_tokens,
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

    // For MC: ensure options is an array of 4 and answer is one of them
    if (question.type === "multiple-choice") {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        console.error("[generate-question] Invalid options:", JSON.stringify(question.options));
        return Response.json({ error: "Ongeldige vraag ontvangen. Probeer het opnieuw." }, { status: 500 });
      }
      // Normalize whitespace for comparison
      const normalize = (s: string) => s.trim().toLowerCase();
      const match = question.options.find(
        (o: string) => normalize(o) === normalize(question.answer)
      );
      if (!match) {
        // Try to find closest option and fix the answer field
        const fixedAnswer = question.options.find(
          (o: string) => normalize(question.answer).includes(normalize(o)) || normalize(o).includes(normalize(question.answer))
        );
        if (fixedAnswer) {
          question.answer = fixedAnswer;
        } else {
          // Answer not in options at all — use first option as fallback and log
          console.warn("[generate-question] Answer not in options, using first option. Answer:", question.answer, "Options:", question.options);
          question.answer = question.options[0];
        }
      }
    }

    // Fire-and-forget analytics
    logUsage(supabaseServer, {
      route: "generate",
      paragraph_id: paragraphId,
      difficulty,
      question_type: question.type,
    });

    return Response.json({ question });
  } catch (err) {
    console.error("[generate-question] Unexpected error:", err);
    return Response.json(
      { error: "Er ging iets mis bij het genereren. Probeer het opnieuw." },
      { status: 500 }
    );
  }
}
