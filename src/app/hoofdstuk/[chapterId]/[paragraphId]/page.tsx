import Link from "next/link";
import { notFound } from "next/navigation";
import { ParagraphSidebar } from "@/components/paragraph/ParagraphSidebar";
import { Separator } from "@/components/ui/separator";
import { QuestionSection } from "@/components/questions/QuestionSection";
import { AIBuddyChat } from "@/components/ai/AIBuddyChat";
import { HighlightText } from "@/components/ui/highlight-text";
import { getParagraph } from "@/lib/data";
import { getQuestions } from "@/lib/questions";

interface ParagraphPageProps {
  params: Promise<{ chapterId: string; paragraphId: string }>;
}

export default async function ParagraphPage({ params }: ParagraphPageProps) {
  const { chapterId, paragraphId } = await params;
  const result = await getParagraph(chapterId, paragraphId);
  if (!result) return notFound();

  const { chapter, paragraph } = result;
  const questions = await getQuestions(paragraphId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex gap-4">
        {/* Sidebar - collapsible on all screens */}
        <div className="fixed bottom-4 left-4 z-40 md:relative md:bottom-auto md:left-auto">
          <ParagraphSidebar chapter={chapter} />
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-8">
          {/* Page title */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="font-heading text-sm text-gres-yellow">
                {chapter.order}.{paragraph.order}
              </span>
              <div className="h-0.5 w-6 rounded-full bg-gres-yellow" />
            </div>
            <h1 className="font-heading text-2xl tracking-wide text-gres-blue sm:text-3xl">
              {paragraph.title}
            </h1>
          </div>

          {/* Leerdoelen & Begrippen balk */}
          <section className="overflow-hidden rounded-2xl border border-gres-yellow/20 bg-gres-yellow/10">
            <div className="grid gap-0 md:grid-cols-2">
              <div className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gres-blue text-xs text-white">
                    🎯
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gres-blue">
                    Deze les leer je..
                  </h2>
                </div>
                <ul className="space-y-2.5">
                  {paragraph.learningGoals.map((goal, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm leading-relaxed"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gres-yellow/30 text-xs text-gres-blue font-bold">
                        ✓
                      </span>
                      <HighlightText text={goal} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-gres-yellow/20 p-6 md:border-l md:border-t-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gres-yellow text-xs">
                    📚
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gres-blue">
                    Kernbegrippen
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paragraph.concepts.map((concept, i) => (
                    <span
                      key={i}
                      className="group relative inline-flex items-center rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-gres-blue shadow-sm cursor-default transition-colors hover:bg-gres-blue/10"
                    >
                      {concept.term}
                      {concept.definition && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-normal rounded-xl bg-gres-blue px-3 py-2 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 w-max max-w-[220px] text-center">
                          {concept.definition}
                          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gres-blue" />
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Video + AI Buddy sectie — video 2/3, AI 1/3 */}
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Video - large */}
            <div className="overflow-hidden rounded-2xl border border-gres-yellow/20 bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-gres-yellow/20 bg-gres-yellow/10 px-5 py-3">
                <span>🎬</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gres-blue">
                  Videoles
                </h3>
              </div>
              <div className="p-4">
                {paragraph.videoUrl ? (
                  <iframe
                    className="aspect-video w-full rounded-xl"
                    src={`https://www.youtube.com/embed/${paragraph.videoUrl.split("v=")[1]?.split("&")[0]}`}
                    title={paragraph.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-gres-blue/10 to-gres-blue/5 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gres-blue/10">
                        <span className="text-3xl">▶️</span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Video wordt later toegevoegd
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Buddy - responsive height */}
            <div className="overflow-hidden rounded-2xl border border-gres-yellow/20 bg-card shadow-sm flex flex-col h-[350px] sm:h-[400px] lg:h-[500px]">
              <div className="flex items-center gap-2 border-b border-gres-yellow/20 bg-gres-yellow/10 px-4 py-3">
                <span>🦎</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gres-blue">
                  GresGekko
                </h3>
                <span className="ml-auto rounded-full bg-gres-yellow/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gres-blue">
                  Beta
                </span>
              </div>
              <AIBuddyChat paragraphId={paragraphId} paragraphTitle={paragraph.title} />
            </div>
          </section>

          <Separator className="bg-gres-blue/10" />

          {/* Samenvatting van de les */}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="h-1 w-8 rounded-full bg-gres-yellow" />
              <h3 className="text-lg font-bold text-foreground">Samenvatting van de les</h3>
            </div>
            {paragraph.infographicUrl ? (
              <div className="overflow-hidden rounded-2xl border border-gres-yellow/20 bg-gres-yellow/10 shadow-sm p-4">
                <img
                  src={paragraph.infographicUrl}
                  alt={`Samenvatting ${paragraph.title}`}
                  className="w-3/4 rounded-2xl mx-auto"
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-dashed border-gres-blue/20 bg-gradient-to-br from-gres-blue/5 to-gres-yellow/5 p-10 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gres-yellow/20">
                    <span className="text-3xl">🖼️</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Samenvatting wordt later toegevoegd
                  </p>
                </div>
              </div>
            )}
          </section>

          <Separator className="bg-gres-blue/10" />

          <QuestionSection questions={questions} />

          {/* Vorige / Volgende navigatie */}
          {(() => {
            const currentIndex = chapter.paragraphs.findIndex((p) => p.id === paragraph.id);
            const prev = currentIndex > 0 ? chapter.paragraphs[currentIndex - 1] : null;
            const next = currentIndex < chapter.paragraphs.length - 1 ? chapter.paragraphs[currentIndex + 1] : null;

            return (
              <div className="flex items-center gap-3 pt-4">
                {prev ? (
                  <Link
                    href={`/hoofdstuk/${chapter.id}/${prev.id}`}
                    className="flex-1 group rounded-2xl border border-gres-blue/15 bg-card p-4 transition-all hover:shadow-md hover:border-gres-blue/30"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      ← Vorige
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gres-blue group-hover:text-gres-blue-light">
                      {chapter.order}.{prev.order} {prev.title}
                    </p>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {next ? (
                  <Link
                    href={`/hoofdstuk/${chapter.id}/${next.id}`}
                    className="flex-1 group rounded-2xl border border-gres-yellow/25 bg-gres-yellow/5 p-4 text-right transition-all hover:shadow-md hover:border-gres-yellow/40"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Volgende →
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gres-blue group-hover:text-gres-blue-light">
                      {chapter.order}.{next.order} {next.title}
                    </p>
                  </Link>
                ) : (
                  <Link
                    href={`/hoofdstuk/${chapter.id}`}
                    className="flex-1 group rounded-2xl border border-green-200 bg-green-50 p-4 text-right transition-all hover:shadow-md hover:border-green-300"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">
                      ✅ Hoofdstuk klaar!
                    </p>
                    <p className="mt-1 text-sm font-semibold text-green-700 group-hover:text-green-800">
                      Terug naar overzicht
                    </p>
                  </Link>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
