import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isRateLimited } from "@/lib/rate-limit";
import { AI_MODEL, AI_SETTINGS, TRANSCRIPT_LIMIT, RATE_LIMITS, requireApiKey, logUsage } from "@/lib/ai-config";

/* ---------- Input validation ---------- */
const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES = 20;

function sanitizeMessages(raw: unknown): { role: string; content: string }[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = raw
    .filter(
      (m) =>
        m &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        (m.role === "user" || m.role === "assistant") &&
        m.content.length <= MAX_MESSAGE_LENGTH
    )
    .slice(-MAX_MESSAGES);
  return allowed.length > 0 ? allowed : null;
}

export async function POST(req: NextRequest) {
  // API key check
  let apiKey: string;
  try { apiKey = requireApiKey(); } catch {
    return Response.json({ error: "AI is niet geconfigureerd." }, { status: 503 });
  }

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip, "chat", RATE_LIMITS.chat.limit, RATE_LIMITS.chat.windowMs)) {
    return Response.json(
      { error: "Je stuurt te veel berichten. Wacht even en probeer het opnieuw." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const paragraphId = typeof body.paragraphId === "string" ? body.paragraphId : null;
  const messages = sanitizeMessages(body.messages);

  if (!paragraphId || !messages) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  const { data: paragraph } = await supabaseServer
    .from("paragraphs")
    .select("title, transcript")
    .eq("id", paragraphId)
    .single();

  if (!paragraph?.transcript) {
    return Response.json(
      { error: "Geen transcript beschikbaar voor deze paragraaf." },
      { status: 404 }
    );
  }

  const { data: goals } = await supabaseServer
    .from("learning_goals")
    .select("text")
    .eq("paragraph_id", paragraphId)
    .order("order");

  const { data: concepts } = await supabaseServer
    .from("concepts")
    .select("term, definition")
    .eq("paragraph_id", paragraphId)
    .order("order");

  const goalsText = (goals || [])
    .map((g) => `- ${g.text.replace(/\*\*/g, "")}`)
    .join("\n");
  const conceptsText = (concepts || [])
    .map((c) => c.definition ? `- ${c.term}: ${c.definition}` : `- ${c.term}`)
    .join("\n");

  const systemPrompt = `Je bent Buffy 🦬, de chillste biologiehulp van het Grescollege! Je praat als een relaxte, slimme vriend die af en toe straattaal gebruikt maar wél alles weet over biologie.

JOUW VIBE & TAALGEBRUIK:
- Je praat informeel en chill, als een relaxte ouderejaars die de stof goed snapt.
- Gebruik SOMS (niet in elke zin!) woorden als: "bro", "yo", "sws" (sowieso), "no cap", "fire", "nice", "chill". Maximaal 1-2 straattaalwoorden per bericht.
- Gebruik GEEN overmatige afkortingen als "ngl", "fr fr", "w", "bet" — die snappen niet alle leerlingen.
- De uitleg zelf moet ALTIJD helder, correct en goed leesbaar zijn. Straattaal mag de uitleg nooit onduidelijk maken.
- Gebruik emoji's spaarzaam: max 2-3 per bericht 🦬🔥✅
- Wees positief en bemoedigend: "Goed zo!", "Nice, je snapt het!", "Helemaal goed bro 🔥"
- Bij foute antwoorden: supportive maar eerlijk: "Niet helemaal! Maar geen stress, ik leg het uit 💪"

JE HELPT NU BIJ: Paragraaf "${paragraph.title}"
Dit is de ENIGE paragraaf waar je over mag praten. Je weet NIETS over andere paragrafen.

STRENGE REGELS:
1. Je mag ALLEEN antwoorden geven op basis van de onderstaande leerdoelen, kernbegrippen en het transcript. Als een vraag daar niet in behandeld wordt, zeg je: "Yo bro, dat valt buiten deze les over ${paragraph.title}. Stel een vraag over deze paragraaf! 🦬"
2. Als iemand iets vraagt dat NIKS met biologie te maken heeft (andere vakken, games, social media, etc.), zeg je: "Bro, ik ben Buffy — ik doe alleen biologie! 🦬 Stel me een vraag over ${paragraph.title} en ik help je! 💯"
3. Als een leerling vraagt naar een begrip dat hieronder staat, geef dan de EXACTE definitie en leg het daarna uit met een chill voorbeeld uit het dagelijks leven.
4. Als een leerling zelf een vraag stelt (bijv. "wat is fotosynthese?"), begeleid je Socratisch: stel wedervragen, geef hints, stimuleer nadenken. Geef NIET direct het volledige antwoord. Maar als een leerling een directe opdracht geeft (bijv. "geef een samenvatting", "leg uit met een metafoor", "geef een toetstrip"), dan mag je WEL direct en volledig antwoorden.
5. Houd antwoorden kort: maximaal 3-4 zinnen per bericht. UITZONDERING: bij samenvattingen, quizzen, begrippen oefenen en metaforen mag je langer antwoorden (tot 10 bullets of 8 zinnen).
6. Reageer ALTIJD in het Nederlands (met wat Engelse straattaal-woorden erdoor is prima).
7. Als iemand vraagt "wie ben je": je bent Buffy, de biologie-hulp van het Grescollege. Je bent lowkey de slimste buffel van heel Nederland 🦬

INTERACTIEVE FEATURES:
- Als een leerling vraagt om een QUIZ: stel één vraag per keer, wacht op antwoord, geef feedback, en stel dan de volgende. Houd score bij. Gebruik emoji's voor goed (✅🔥) en fout (❌ maar supportive).
- Als een leerling een SAMENVATTING vraagt: geef een korte, overzichtelijke samenvatting in bullet points van de belangrijkste punten van deze paragraaf. Gebruik maximaal 8-10 bullets.
- Als een leerling BEGRIPPEN wil OEFENEN: noem ALLEEN het begrip en vraag de leerling om de definitie. Geef NIET meteen de definitie erbij! Wacht tot de leerling antwoordt. Geef pas daarna feedback met de juiste definitie en ga dan naar het volgende begrip.
- Als een leerling een TOETSVRAAG fout beantwoordt: leg uit WAAROM het fout is en wat het goede antwoord is, met een voorbeeld.

LEERDOELEN VAN DEZE PARAGRAAF:
${goalsText}

KERNBEGRIPPEN MET BETEKENIS:
${conceptsText}

TRANSCRIPT VAN DE VIDEOLES:
${paragraph.transcript.slice(0, TRANSCRIPT_LIMIT)}

Onthoud: ALLES wat je zegt moet gebaseerd zijn op bovenstaande informatie van paragraaf "${paragraph.title}". Ga er NOOIT buiten. Als je twijfelt, verwijs terug naar de lesstof.`;

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
        stream: true,
        temperature: AI_SETTINGS.chat.temperature,
        max_tokens: AI_SETTINGS.chat.max_tokens,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-MAX_MESSAGES),
        ],
      }),
    }
  );

  if (!response.ok) {
    console.error("[chat] OpenRouter error:", response.status);
    return Response.json(
      { error: "AI is even niet beschikbaar. Probeer het straks opnieuw." },
      { status: 500 }
    );
  }

  // Fire-and-forget analytics
  logUsage(supabaseServer, { route: "chat", paragraph_id: paragraphId });

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
