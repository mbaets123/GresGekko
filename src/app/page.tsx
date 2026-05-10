import { ChapterCard } from "@/components/chapter/ChapterCard";
import { SearchBar } from "@/components/search/SearchBar";
import { getChapters } from "@/lib/data";

export default async function HomePage() {
  const chapters = await getChapters();
  return (
    <>
      {/* Hero section */}
      <section className="relative overflow-hidden py-12 sm:py-16">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/Gresbuffy.jpg')" }}
        />
        <div className="absolute inset-0 bg-gres-blue/75" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h1 className="font-heading text-4xl tracking-wide text-white sm:text-5xl lg:text-6xl">
            Fakka, ik ben Buffy 🦬
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            Jouw ultieme biologie maatje. Wil je video&apos;s kijken, vragen
            oefenen of gewoon even vragen wat je niet snapt? Ik ben er voor je 💪
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gres-yellow/20 px-4 py-1.5 text-sm font-medium text-gres-yellow backdrop-blur">
            🎓 Leerjaar 1 &middot; vmbo - havo
          </div>
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
      {/* Over deze omgeving */}
      <section className="border-t border-gres-blue/10 bg-gradient-to-b from-gres-blue/[0.03] to-gres-yellow/[0.05]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:gap-14">
            {/* Buffy afbeelding */}
            <div className="shrink-0">
              <div className="relative h-52 w-52 overflow-hidden rounded-full border-4 border-gres-yellow/30 shadow-xl sm:h-64 sm:w-64">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url('/Gresbuffy.jpg')" }}
                />
              </div>
              <div className="mx-auto -mt-5 w-fit rounded-full bg-gres-blue px-5 py-1.5 text-sm font-bold text-white shadow-md">
                Buffy 🦬
              </div>
            </div>

            {/* Tekst */}
            <div className="flex-1 space-y-5">
              <h2 className="font-heading text-2xl tracking-wide text-gres-blue sm:text-3xl">
                Over deze omgeving
              </h2>

              <p className="text-sm leading-relaxed text-foreground/80">
                Yo! Ik ben dus gemaakt door mijn baas{" "}
                <strong className="text-foreground">Mike Baets</strong> — biologiedocent
                op het Grescollege. Hij heeft mij alles geleerd zodat ik jullie zo goed
                mogelijk op weg kan helpen. Hij wilde biologie net iets leuker,
                persoonlijker en toegankelijker maken. Daarom heeft hij mij gecre&euml;erd.
                Bedank hem maar een keer als je hem ziet! 😄
              </p>

              <div>
                <p className="mb-1 text-sm font-bold text-gres-blue">
                  🎯 Onze visie
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Ik ben er niet om je docent te vervangen — ik ben jouw 24/7 beschikbare
                  maatje erbij. Oefenvragen, uitleg op jouw persoonlijke niveau en directe
                  feedback, allemaal voor jou. Wanneer je maar wilt.
                </p>
              </div>

              <div>
                <p className="mb-1 text-sm font-bold text-gres-blue">
                  🎬 De video&apos;s
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Alle uitlegvideo&apos;s komen van het YouTube-kanaal van{" "}
                  <strong className="text-foreground">Joost</strong>. Samen met het
                  open leermateriaal van{" "}
                  <a
                    href="https://www.vo-content.nl/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gres-blue underline decoration-gres-yellow/40 underline-offset-2 hover:decoration-gres-yellow"
                  >
                    VO-content
                  </a>{" "}
                  vormt dit de basis van elke les. Goede uitleg + AI-hulp = combo! 🔥
                </p>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="https://www.grescollege.nl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-gres-blue/20 bg-gres-blue/5 px-4 py-2 text-xs font-semibold text-gres-blue transition-all hover:border-gres-blue/40 hover:shadow-sm"
                >
                  🏫 Grescollege
                </a>
                <a
                  href="https://www.youtube.com/channel/UCV-_BhPt2wrBQYzAowlRMCA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-all hover:border-red-300 hover:shadow-sm"
                >
                  ▶️ Joost op YouTube
                </a>
                <a
                  href="https://www.linkedin.com/in/mike-baets-7b6464156/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 transition-all hover:border-blue-300 hover:shadow-sm"
                >
                  💼 Mike op LinkedIn
                </a>
                <a
                  href="https://www.vo-content.nl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-600 transition-all hover:border-green-300 hover:shadow-sm"
                >
                  📚 VO-content
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
