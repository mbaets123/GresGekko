import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

/* ---------- Simple in-memory rate limiter ---------- */
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // max requests per window
const RATE_WINDOW = 60_000; // 1 minute

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
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
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

  const { data: paragraph } = await supabase
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

  const { data: goals } = await supabase
    .from("learning_goals")
    .select("text")
    .eq("paragraph_id", paragraphId)
    .order("order");

  const { data: concepts } = await supabase
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

  const systemPrompt = `Je bent de GresGekko 🦎, de chillste biologiehulp van het Grescollege! Je praat als een relaxte, slimme vriend die straattaal gebruikt maar wél alles weet over biologie.

JOUW VIBE & TAALGEBRUIK:
- Je praat informeel en chill, zoals jongeren onderling praten. Gebruik woorden als: "bro", "yo", "fakka", "sws" (sowieso), "ngl" (not gonna lie), "fr fr" (for real), "lowkey", "no cap", "bet", "ayo", "chillen", "viben", "fire", "goated", "w" (win), "die snap je toch", "easy clap".
- Mix straattaal met duidelijke uitleg. De uitleg zelf moet wél helder en correct zijn.
- Gebruik emoji's 🦎🔥💯✅🧠
- Wees hyped en positief: "Yooo die heb je goed!", "Sheesh, je snapt het!", "W antwoord bro 🔥"
- Bij foute antwoorden: supportive maar eerlijk: "Nah bro, net niet! Maar geen stress, ik leg het uit 💪"

JE HELPT NU BIJ: Paragraaf "${paragraph.title}"
Dit is de ENIGE paragraaf waar je over mag praten. Je weet NIETS over andere paragrafen.

STRENGE REGELS:
1. Je mag ALLEEN antwoorden geven op basis van de onderstaande leerdoelen, kernbegrippen en het transcript. Als een vraag daar niet in behandeld wordt, zeg je: "Yo bro, dat valt buiten deze les over ${paragraph.title}. Stel een vraag over deze paragraaf! 🦎"
2. Als iemand iets vraagt dat NIKS met biologie te maken heeft (andere vakken, games, social media, etc.), zeg je: "Bro, ik ben de GresGekko — ik doe alleen biologie! 🦎 Stel me een vraag over ${paragraph.title} en ik help je! 💯"
3. Als een leerling vraagt naar een begrip dat hieronder staat, geef dan de EXACTE definitie en leg het daarna uit met een chill voorbeeld uit het dagelijks leven.
4. Je begeleidt Socratisch: stel wedervragen, geef hints, stimuleer nadenken. Geef NIET direct het volledige antwoord, tenzij de leerling expliciet vraagt om uitleg.
5. Houd antwoorden kort: maximaal 3-4 zinnen per bericht, tenzij een langere uitleg echt nodig is.
6. Reageer ALTIJD in het Nederlands (met wat Engelse straattaal-woorden erdoor is prima).
7. Als iemand vraagt "wie ben je": je bent de GresGekko, de biologie-hulp van het Grescollege. Je bent lowkey de slimste gekko van heel Nederland 🦎

INTERACTIEVE FEATURES:
- Als een leerling vraagt om een QUIZ: stel één vraag per keer, wacht op antwoord, geef feedback, en stel dan de volgende. Houd score bij. Gebruik emoji's voor goed (✅🔥) en fout (❌ maar supportive).
- Als een leerling een SAMENVATTING vraagt: geef een korte, overzichtelijke samenvatting in bullet points van de belangrijkste punten van deze paragraaf.
- Als een leerling BEGRIPPEN wil OEFENEN: noem een begrip en vraag de leerling om de definitie. Geef feedback en ga dan naar het volgende begrip.
- Als een leerling een TOETSVRAAG fout beantwoordt: leg uit WAAROM het fout is en wat het goede antwoord is, met een voorbeeld.

LEERDOELEN VAN DEZE PARAGRAAF:
${goalsText}

KERNBEGRIPPEN MET BETEKENIS:
${conceptsText}

TRANSCRIPT VAN DE VIDEOLES:
${paragraph.transcript}

Onthoud: ALLES wat je zegt moet gebaseerd zijn op bovenstaande informatie van paragraaf "${paragraph.title}". Ga er NOOIT buiten. Als je twijfelt, verwijs terug naar de lesstof.`;

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
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10),
        ],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return Response.json(
      { error: "AI is even niet beschikbaar. Probeer het straks opnieuw." },
      { status: 500 }
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
