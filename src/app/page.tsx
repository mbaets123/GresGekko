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
          style={{ backgroundImage: "url('/Gresbuffy.jpg')" }}
        />
        <div className="absolute inset-0 bg-gres-blue/75" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gres-yellow/20 px-4 py-1.5 text-sm font-medium text-gres-yellow backdrop-blur">
            🎓 Leerjaar 1 &middot; vmbo - havo
          </div>
          <h1 className="font-heading text-4xl tracking-wide text-white sm:text-5xl lg:text-6xl">
            Fakka, ik ben Buffy 🦬
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
            Jouw ultieme biologie maatje. Wil je video&apos;s kijken, vragen
            oefenen of gewoon even vragen wat je niet snapt? Ik ben er voor je 💪
          </p>
        </div>
      </section>

      {/* Search bar — outside hero to prevent overflow clipping */}
      <div className="relative z-20 mx-auto -mt-6 max-w-7xl px-4 sm:px-6">
        <SearchBar chapters={chapters} />
      </div>

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
