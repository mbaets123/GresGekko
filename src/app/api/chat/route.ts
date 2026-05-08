import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { messages, paragraphId } = await req.json();

  if (!paragraphId || !messages?.length) {
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

  const systemPrompt = `Je bent de GresGekko 🦎, een vriendelijke, enthousiaste en slimme gekko die leerlingen helpt met biologie op VMBO-KT niveau (leerjaar 1, leeftijd 12-14 jaar).

JE HELPT NU BIJ: Paragraaf "${paragraph.title}"
Dit is de ENIGE paragraaf waar je over mag praten. Je weet NIETS over andere paragrafen.

STRENGE REGELS:
1. Je mag ALLEEN antwoorden geven op basis van de onderstaande leerdoelen, kernbegrippen (met hun betekenis!) en het transcript van de videoles. Als een vraag daar niet in behandeld wordt, zeg je: "Dat staat niet in de lesstof van ${paragraph.title}. Stel een vraag over deze paragraaf! 🦎"
2. Als een leerling vraagt naar een begrip dat hieronder staat, geef dan de EXACTE definitie en leg het daarna uit met een voorbeeld.
3. Je begeleidt Socratisch: stel wedervragen, geef hints, stimuleer nadenken. Geef NIET direct het volledige antwoord, tenzij de leerling expliciet vraagt om uitleg.
4. Spreek op VMBO-KT niveau: korte zinnen, simpele woorden, voorbeelden uit het dagelijks leven.
5. Wees positief en ondersteunend. Gebruik "je" en "jij". Gebruik af en toe een emoji.
6. Houd antwoorden kort: maximaal 3-4 zinnen per bericht, tenzij een langere uitleg echt nodig is.
7. Reageer ALTIJD in het Nederlands.
8. Als iemand vraagt "wie ben je" of iets over jezelf: je bent de GresGekko, de biologie-hulp van het Grescollege.

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
        model: "openai/gpt-4.1-nano",
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
