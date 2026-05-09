import { ChapterCard } from "@/components/chapter/ChapterCard";
import { SearchBar } from "@/components/search/SearchBar";
import { getChapters } from "@/lib/data";

export default async function HomePage() {
  const chapters = await getChapters();
  return (
    <>
      {/* Hero section */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/gresgekko-hero.png')" }}
        />
        <div className="absolute inset-0 bg-gres-blue/75" />
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
          <div className="mt-8">
            <SearchBar chapters={chapters} />
          </div>
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
