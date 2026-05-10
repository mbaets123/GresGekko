import Link from "next/link";
import { notFound } from "next/navigation";
import { ParagraphSidebar } from "@/components/paragraph/ParagraphSidebar";
import { Separator } from "@/components/ui/separator";
import { QuestionSection } from "@/components/questions/QuestionSection";
import { AIBuddyChat } from "@/components/ai/AIBuddyChat";
import { HighlightText } from "@/components/ui/highlight-text";
import { ConceptChip } from "@/components/ui/ConceptChip";
import { MarkVisited } from "@/components/ui/MarkVisited";
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
      <MarkVisited paragraphId={paragraphId} />
      <div className="flex gap-4">
        {/* Sidebar - collapsible on all screens */}
        <div className="fixed bottom-4 left-4 z-40 md:relative md:bottom-auto md:left-auto">
          <ParagraphSidebar chapter={chapter} />
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-8">
          {/* Navigatie + Page title */}
          <div>
            {(() => {
              const currentIndex = chapter.paragraphs.findIndex((p) => p.id === paragraph.id);
              const prev = currentIndex > 0 ? chapter.paragraphs[currentIndex - 1] : null;
              const next = currentIndex < chapter.paragraphs.length - 1 ? chapter.paragraphs[currentIndex + 1] : null;

              return (
                <div className="mb-4 flex items-center justify-between">
                  {prev ? (
                    <Link
                      href={`/hoofdstuk/${chapter.id}/${prev.id}`}
                      className="group inline-flex items-center gap-2 rounded-xl border border-gres-blue/15 bg-card px-3 py-2 text-xs transition-all hover:shadow-sm hover:border-gres-blue/30"
                    >
                      <span className="text-muted-foreground">←</span>
                      <span className="font-semibold text-gres-blue group-hover:text-gres-blue-light">
                        {chapter.order}.{prev.order} {prev.title}
                      </span>
                    </Link>
                  ) : (
                    <div />
                  )}
                  {next ? (
                    <Link
                      href={`/hoofdstuk/${chapter.id}/${next.id}`}
                      className="group inline-flex items-center gap-2 rounded-xl border border-gres-yellow/25 bg-gres-yellow/5 px-3 py-2 text-xs transition-all hover:shadow-sm hover:border-gres-yellow/40"
                    >
                      <span className="font-semibold text-gres-blue group-hover:text-gres-blue-light">
                        {chapter.order}.{next.order} {next.title}
                      </span>
                      <span className="text-muted-foreground">→</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/hoofdstuk/${chapter.id}`}
                      className="group inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs transition-all hover:shadow-sm hover:border-green-300"
                    >
                      <span className="font-semibold text-green-700 group-hover:text-green-800">
                        Terug naar overzicht
                      </span>
                      <span>✅</span>
                    </Link>
                  )}
                </div>
              );
            })()}
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
                    <ConceptChip key={i} term={concept.term} definition={concept.definition} />
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
                    loading="lazy"
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
                <span>🦬</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gres-blue">
                  Buffy
                </h3>
                <span className="ml-auto rounded-full bg-gres-yellow/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gres-blue">
                  Beta
                </span>
              </div>
              <AIBuddyChat paragraphId={paragraphId} paragraphTitle={paragraph.title} />
            </div>
          </section>

          {/* Slides + Infographic naast elkaar */}
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Slides */}
            {paragraph.slideUrl && (
              <div className="overflow-hidden rounded-2xl border border-gres-yellow/20 bg-card shadow-sm flex flex-col">
                <div className="flex items-center justify-between border-b border-gres-yellow/20 bg-gres-yellow/10 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span>📊</span>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gres-blue">
                      Slides
                    </h3>
                  </div>
                  <a
                    href={paragraph.slideUrl}
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gres-blue/15 bg-white dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gres-blue transition-all hover:shadow-sm hover:border-gres-blue/30"
                  >
                    📥 Download
                  </a>
                </div>
                <div className="flex-1 p-4">
                  <iframe
                    className="w-full h-full rounded-xl border-0"
                    style={{ minHeight: "400px" }}
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(`https://bio-buffy.vercel.app${paragraph.slideUrl}`)}`}
                    title={`Slides - ${paragraph.title}`}
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Infographic / Samenvatting */}
            <div className="overflow-hidden rounded-2xl border border-gres-yellow/20 bg-card shadow-sm flex flex-col">
              <div className="flex items-center gap-2 border-b border-gres-yellow/20 bg-gres-yellow/10 px-5 py-3">
                <span>🖼️</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gres-blue">
                  Samenvatting
                </h3>
              </div>
              <div className="flex-1 p-4 flex items-center justify-center">
                {paragraph.infographicUrl ? (
                  <img
                    src={paragraph.infographicUrl}
                    alt={`Samenvatting ${paragraph.title}`}
                    className="w-full rounded-xl"
                  />
                ) : (
                  <div className="text-center py-10">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gres-yellow/20">
                      <span className="text-3xl">🖼️</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Samenvatting wordt later toegevoegd
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <Separator className="bg-gres-blue/10" />

          <QuestionSection questions={questions} paragraphId={paragraphId} />
        </div>
      </div>
    </div>
  );
}
