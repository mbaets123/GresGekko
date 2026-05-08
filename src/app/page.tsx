import { ChapterCard } from "@/components/chapter/ChapterCard";
import { getChapters } from "@/lib/data";

export default async function HomePage() {
  const chapters = await getChapters();
  return (
    <>
      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gres-blue via-gres-blue to-gres-blue-light py-16 sm:py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-10 top-10 text-8xl">🧬</div>
          <div className="absolute right-20 top-16 text-7xl">🔬</div>
          <div className="absolute left-1/3 bottom-8 text-6xl">🌱</div>
          <div className="absolute right-10 bottom-12 text-8xl">🧠</div>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gres-yellow/20 px-4 py-1.5 text-sm font-medium text-gres-yellow backdrop-blur">
            🎓 Leerjaar 1 &middot; VMBO-KT
          </div>
          <h1 className="font-heading text-4xl tracking-wide text-white sm:text-5xl lg:text-6xl">
            Biologie met GresGekko 🦎
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
            Fakka! Ik ben GresGekko, jouw AI-bio-hulpje. Bekijk de video&apos;s
            van Joost, oefen met vragen en stel mij alles wat je wilt weten!
            Samen worden wij nog slimmer.
          </p>
        </div>
      </section>

      {/* Chapter grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-1 w-8 rounded-full bg-gres-yellow" />
          <h2 className="text-lg font-semibold text-foreground">
            Hoofdstukken
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      </section>
    </>
  );
}
