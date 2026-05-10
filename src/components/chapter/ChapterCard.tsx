import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { Chapter } from "@/types";

const chapterColors = [
  { bg: "from-blue-500/10 to-cyan-500/10", border: "hover:border-blue-400/40", icon: "bg-blue-500/15", overlay: "bg-blue-800/60", overlayHover: "group-hover:bg-blue-800/50" },
  { bg: "from-orange-500/10 to-red-500/10", border: "hover:border-orange-400/40", icon: "bg-orange-500/15", overlay: "bg-orange-800/60", overlayHover: "group-hover:bg-orange-800/50" },
  { bg: "from-green-500/10 to-emerald-500/10", border: "hover:border-green-400/40", icon: "bg-green-500/15", overlay: "bg-green-800/60", overlayHover: "group-hover:bg-green-800/50" },
  { bg: "from-red-500/10 to-pink-500/10", border: "hover:border-red-400/40", icon: "bg-red-500/15", overlay: "bg-red-800/60", overlayHover: "group-hover:bg-red-800/50" },
  { bg: "from-purple-500/10 to-violet-500/10", border: "hover:border-purple-400/40", icon: "bg-purple-500/15", overlay: "bg-purple-800/60", overlayHover: "group-hover:bg-purple-800/50" },
  { bg: "from-indigo-500/10 to-blue-500/10", border: "hover:border-indigo-400/40", icon: "bg-indigo-500/15", overlay: "bg-indigo-800/60", overlayHover: "group-hover:bg-indigo-800/50" },
];

interface ChapterCardProps {
  chapter: Chapter;
}

export function ChapterCard({ chapter }: ChapterCardProps) {
  const colors = chapterColors[(chapter.order - 1) % chapterColors.length];

  return (
    <Link href={`/hoofdstuk/${chapter.id}`}>
      <Card
        className={`group relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${colors.border}`}
      >
        {/* Hero banner met Buffy afbeelding */}
        <div className="relative h-32 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url('/chapters/${chapter.order}.jpg')` }}
          />
          <div className={`absolute inset-0 ${colors.overlay} ${colors.overlayHover} transition-all duration-300`} />
          <div className="relative flex h-full items-end p-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}
            >
              {chapter.icon}
            </div>
          </div>
        </div>
        <div
          className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 transition-opacity duration-300 pointer-events-none`}
        />
        <div className="relative flex flex-1 flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg tracking-wide transition-colors group-hover:text-gres-blue">
              Hoofdstuk {chapter.order}
            </CardTitle>
            <CardDescription className="text-[15px] font-medium text-foreground/80">
              {chapter.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              {chapter.description}
            </p>
            <div className="mt-auto flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gres-yellow/20 px-3 py-1 text-xs font-semibold text-gres-blue">
                📖 {chapter.paragraphs.length}{" "}
                {chapter.paragraphs.length === 1 ? "paragraaf" : "paragrafen"}
              </span>
              <span className="text-xs font-medium text-gres-blue/60 transition-colors group-hover:text-gres-blue">
                Bekijk →
              </span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
