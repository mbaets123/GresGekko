import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isRateLimited } from "@/lib/rate-limit";

/* ---------- POST handler ---------- */

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip, "generate", 15, 60_000)) {
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
    ? body.previousQuestions.slice(-10)
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

  const { data: concepts } = await supabaseServer
    .from("concepts")
    .select("term, definition")
    .eq("paragraph_id", paragraphId)
    .order("order");

  const { data: goals } = await supabaseServer
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

  const systemPrompt = `Je bent een biologiedocent die oefenvragen maakt voor vmbo-havo leerjaar 1.

OPDRACHT: Genereer precies 1 vraag op het onderstaande niveau.

${difficultyBlocks[difficulty]}

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
- Houd je STRIKT aan het beschreven niveau. Een niveau 1 vraag mag NOOIT een situatieschets bevatten. Een niveau 4 vraag MOET de leerling laten redeneren over verbanden.
- Bedenk een NIEUW scenario of context voor de vraag${previousQuestions.length > 0 ? `\n- Deze vragen zijn al gesteld, stel GEEN vergelijkbare vraag. Kies een ANDER onderwerp/begrip:\n${previousQuestions.map((q) => `  * "${q}"`).join("\n")}` : ""}
- Bij multiple-choice: geef precies 4 KORTE opties (max 15 woorden per optie), waarvan 1 correct. Baseer de foute opties op veelgemaakte fouten en misconcepties van leerlingen (bijv. verwisseling van begrippen, verkeerde oorzaak-gevolg, halve waarheden). Gebruik GEEN "A.", "B." etc. Het "answer" veld moet EXACT overeenkomen met een van de opties.
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
