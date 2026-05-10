# Biologie met GresGekko - Project Context

> Dit bestand bevat alle essentiële context voor het project. Lees dit bestand bij het starten van een nieuw gesprek.

## Project Overzicht

- **Naam**: Biologie met GresGekko
- **Doel**: AI-ondersteunde biologie-leeromgeving voor vmbo-havo leerjaar 1 (Grescollege)
- **Maker**: Mike Baets (mbaets123@gmail.com)
- **Projectpad**: `C:\Users\MBaet\Desktop\Biologie leerjaar 1\biologie-leeromgeving`

## Tech Stack

- **Framework**: Next.js 16.2.6 (App Router, Turbopack)
- **Taal**: TypeScript
- **Styling**: Tailwind CSS 4 met OKLCH kleuren
- **UI**: shadcn/ui components
- **Database**: Supabase PostgreSQL (project ID: `nnpzxphodimipscrvvbg`)
- **AI Chat**: OpenRouter API (model: `openai/gpt-4.1-nano`) via SSE streaming
- **Hosting**: Vercel
- **Fonts**: Kanit (body), Titan One (headings)

## Brandkleuren

- **Donkerblauw (gres-blue)**: `oklch(0.35 0.12 260)` / hex ~`#1B3A5C`
- **Goudgeel (gres-yellow)**: `oklch(0.80 0.16 85)` / hex ~`#C9A227`

## Projectstructuur

```
src/
├── app/
│   ├── layout.tsx                    # Root layout met fonts, metadata
│   ├── page.tsx                      # Homepage met hoofdstukken-overzicht
│   ├── globals.css                   # Tailwind config, OKLCH variabelen, animaties
│   ├── api/chat/route.ts             # AI chat endpoint (SSE streaming, rate limiting)
│   └── hoofdstuk/
│       ├── [chapterId]/page.tsx      # Hoofdstuk-overzicht met paragraaflijst
│       └── [chapterId]/[paragraphId]/page.tsx  # Paragraaf-detail pagina
├── components/
│   ├── ai/AIBuddyChat.tsx           # Chat component met GresGekko (react-markdown)
│   ├── chapter/ChapterCard.tsx       # Hoofdstuk-kaart op homepage
│   ├── layout/
│   │   ├── Header.tsx                # Sticky header met logo, Hoofdmenu, DarkModeToggle
│   │   ├── Footer.tsx                # Compacte footer
│   │   └── DarkModeToggle.tsx        # Dark/light mode schakelaar
│   ├── paragraph/ParagraphSidebar.tsx # Zijbalk met paragraaf-navigatie
│   ├── questions/
│   │   ├── QuestionSection.tsx       # Vragen-sectie met pill-tabs per niveau
│   │   └── QuestionCard.tsx          # Individuele vraagkaart
│   ├── search/SearchBar.tsx          # Zoekbalk
│   └── ui/
│       ├── ParagraphProgress.tsx     # Groen vinkje bij bezochte paragrafen (localStorage)
│       ├── MarkVisited.tsx           # Markeert paragraaf als bezocht in localStorage
│       ├── ConceptChip.tsx           # Begrippen-chip met tooltip
│       ├── highlight-text.tsx        # Tekst highlighter
│       └── (shadcn components)       # button, card, badge, dialog, etc.
├── lib/
│   ├── data.ts                       # Data-fetching met unstable_cache (revalidate: 60s)
│   ├── questions.ts                  # Vragen ophalen uit Supabase
│   ├── supabase.ts                   # Supabase client
│   └── utils.ts                      # cn() utility
├── data/chapters.ts                  # Fallback/statische chapter data
└── types/index.ts                    # TypeScript interfaces
```

## Database Schema (Supabase)

### Tabellen

**chapters**
- `id` (text, PK) - bijv. "1", "2", etc.
- `title` (text)
- `description` (text)
- `order` (int)
- `icon` (text) - emoji

**paragraphs**
- `id` (text, PK) - bijv. "5-1", "5-2"
- `chapter_id` (text, FK -> chapters)
- `title` (text)
- `order` (int)
- `video_url` (text)
- `transcript` (text) - volledige videoles transcript
- `infographic_url` (text) - pad naar `/infographics/X-Y.png|jpg`
- `is_extra` (boolean)

**learning_goals**
- `paragraph_id` (text, FK -> paragraphs)
- `text` (text)
- `order` (int)

**concepts**
- `paragraph_id` (text, FK -> paragraphs)
- `term` (text)
- `definition` (text)
- `order` (int)

**questions**
- `id` (int, PK)
- `paragraph_id` (text, FK -> paragraphs)
- `type` (text) - "multiple-choice", "open", "fill-in"
- `difficulty` (int) - 1-4
- `question` (text)
- `options` (text[]) - alleen bij multiple-choice
- `answer` (text)
- `explanation` (text)

## Inhoud

- **6 hoofdstukken**, elk met **7 paragrafen** = 42 paragrafen totaal
- Elke paragraaf heeft: video, transcript, leerdoelen, kernbegrippen, vragen, infographic
- Hoofdstukken:
  1. Cellen
  2. Schimmels, wieren en bacterien
  3. Planten
  4. Bewegen en ondersteuning
  5. Zintuigen en gedrag
  6. Voortplanting bij planten en dieren

## Infographics

- Opgeslagen in `public/infographics/`
- Naamconventie: `{chapter}-{paragraph}.png` of `.jpg` (bijv. `5-1.png`, `4-3.jpg`)
- Database-veld: `infographic_url` = `/infographics/X-Y.ext`
- **Status**: Alle 42 paragrafen hebben een infographic (H1-H6 compleet)
- Stijl: landscape, donkerblauw (#1B3A5C) achtergrond, goudgeel (#C9A227) accenten

## AI Chat (GresGekko)

- **Persona**: GresGekko 🦎 — chille biologiehulp met straattaal
- **Endpoint**: `/api/chat` (POST, SSE streaming)
- **Model**: openai/gpt-4.1-nano via OpenRouter
- **Rate limit**: 30 requests/min per IP
- **Max bericht**: 500 tekens, max 20 berichten in context
- **Scope**: antwoordt ALLEEN over de huidige paragraaf (transcript + leerdoelen + begrippen)
- **Rendering**: react-markdown met custom component overrides

## Belangrijke Features

1. **Paragraaf voortgang**: localStorage (`gresgekko-progress`) slaat bezochte paragraaf-IDs op
2. **Dark mode**: class-based toggle, opgeslagen in localStorage
3. **Vragen per niveau**: pill-tabs filteren op difficulty 1-4
4. **Collapsible sidebar**: paragraaf-navigatie, fixed op mobile
5. **Scroll-to-bottom**: "↓ Nieuwste" knop in chat bij omhoog scrollen
6. **Fade-in animatie**: `animate-fade-in` class (0.3s ease-out)

## Caching

- `getChapters()` en `getChapter()` gebruiken `unstable_cache` met `revalidate: 60` seconden
- Bij database-wijzigingen: herstart dev server + verwijder `.next` map voor directe update
- Commando: `Remove-Item -Recurse -Force .next; npm run dev`

## Dev Commando's

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
```

## Git Status

- Remote: GitHub (push via git push)
- **Let op**: Header.tsx heeft een uncommitted wijziging (Hoofdmenu en DarkModeToggle posities omgewisseld)

## Veelvoorkomende Taken

### Infographic toevoegen
1. Kopieer bestand naar `public/infographics/{chapter}-{paragraph}.ext`
2. Update Supabase: `UPDATE paragraphs SET infographic_url = '/infographics/X-Y.ext' WHERE id = 'X-Y';`
3. Herstart server met schone cache

### Database query uitvoeren
- Supabase project ID: `nnpzxphodimipscrvvbg`
- Gebruik `execute_sql` MCP tool

### Prompts voor infographics
- Stijlinstructies staan in: `C:\Users\MBaet\Desktop\Biologie leerjaar 1\infographic-prompts-h4-h1.md`
- Format: landscape, geen titel in beeld, vmbo/havo doelgroep, donkerblauw + goudgeel
