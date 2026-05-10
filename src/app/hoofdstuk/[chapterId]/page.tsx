import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ParagraphProgress } from "@/components/ui/ParagraphProgress";
import { getChapter } from "@/lib/data";

interface ChapterPageProps {
  params: Promise<{ chapterId: string }>;
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { chapterId } = await params;
  const chapter = await getChapter(chapterId);

  if (!chapter) return notFound();

  const hasExtra = chapter.paragraphs.some((p) => p.isExtra);

  return (
    <>
      {/* Chapter hero */}
      <section className="relative overflow-hidden py-12">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/chapters/${chapter.order}.jpg')` }}
        />
        <div className="absolute inset-0 bg-gres-blue/75" />
        <div className="absolute right-10 top-6 text-[120px] opacity-10 select-none">
          {chapter.icon}
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 backdrop-blur transition hover:bg-white/20"
          >
            ← Alle hoofdstukken
          </Link>
          <h1 className="font-heading text-3xl tracking-wide text-white sm:text-4xl">
            Hoofdstuk {chapter.order}: {chapter.title}
          </h1>
          <p className="mt-2 max-w-lg text-white/70">{chapter.description}</p>
        </div>
      </section>

      {/* Paragraph grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 rounded-full bg-gres-yellow" />
            <h2 className="text-lg font-semibold">Paragrafen</h2>
          </div>

          {/* Legenda */}
          {hasExtra && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-gres-yellow/40 bg-gres-yellow/15" />
                <span className="text-muted-foreground">Verplicht</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-gres-blue/40 bg-gres-blue/15" />
                <span className="text-muted-foreground">Extra</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {chapter.paragraphs.map((paragraph) => (
            <Link
              key={paragraph.id}
              href={`/hoofdstuk/${chapter.id}/${paragraph.id}`}
            >
              <Card
                className={`group relative h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  paragraph.isExtra
                    ? "border-gres-blue/25 bg-gres-blue/[0.06] hover:border-gres-blue/40"
                    : "border-gres-yellow/25 bg-gres-yellow/[0.08] hover:border-gres-yellow/40"
                }`}
              >
                <div
                  className={`absolute top-0 left-0 h-1 w-full transition-opacity opacity-0 group-hover:opacity-100 ${
                    paragraph.isExtra
                      ? "bg-gres-blue"
                      : "bg-gres-yellow"
                  }`}
                />
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-heading text-sm ${
                        paragraph.isExtra
                          ? "bg-gres-blue/15 text-gres-blue"
                          : "bg-gres-yellow/25 text-gres-blue"
                      }`}
                    >
                      {chapter.order}.{paragraph.order}
                    </div>
                    <ParagraphProgress paragraphId={paragraph.id} />
                    {paragraph.isExtra && (
                      <span className="rounded-full bg-gres-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gres-blue">
                        Extra
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base font-semibold transition-colors group-hover:text-gres-blue">
                    {paragraph.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {paragraph.learningGoals.length} leerdoel
                    {paragraph.learningGoals.length !== 1 && "en"} ·{" "}
                    {paragraph.concepts.length} begrip
                    {paragraph.concepts.length !== 1 && "pen"}
                  </CardDescription>
                  <span className="mt-3 inline-flex text-xs font-medium text-gres-blue/50 transition-colors group-hover:text-gres-blue">
                    Start leren →
                  </span>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
