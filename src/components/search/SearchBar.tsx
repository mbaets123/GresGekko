"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Chapter } from "@/types";

interface SearchBarProps {
  chapters: Chapter[];
}

interface SearchResult {
  type: "paragraph" | "concept";
  chapterId: string;
  paragraphId: string;
  title: string;
  subtitle: string;
  match: string;
}

export function SearchBar({ chapters }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const found: SearchResult[] = [];

    for (const chapter of chapters) {
      for (const paragraph of chapter.paragraphs) {
        // Match op paragraaf titel
        if (paragraph.title.toLowerCase().includes(q)) {
          found.push({
            type: "paragraph",
            chapterId: chapter.id,
            paragraphId: paragraph.id,
            title: paragraph.title,
            subtitle: `Hoofdstuk ${chapter.order}: ${chapter.title}`,
            match: `§${chapter.order}.${paragraph.order}`,
          });
        }

        // Match op concepten
        for (const concept of paragraph.concepts) {
          if (
            concept.term.toLowerCase().includes(q) ||
            concept.definition?.toLowerCase().includes(q)
          ) {
            found.push({
              type: "concept",
              chapterId: chapter.id,
              paragraphId: paragraph.id,
              title: concept.term,
              subtitle: `${chapter.order}.${paragraph.order} ${paragraph.title}`,
              match: concept.definition || "",
            });
          }
        }

        // Match op leerdoelen
        for (const goal of paragraph.learningGoals) {
          if (goal.toLowerCase().replace(/\*\*/g, "").includes(q)) {
            found.push({
              type: "paragraph",
              chapterId: chapter.id,
              paragraphId: paragraph.id,
              title: goal.replace(/\*\*/g, ""),
              subtitle: `${chapter.order}.${paragraph.order} ${paragraph.title}`,
              match: "Leerdoel",
            });
          }
        }
      }
    }

    // Deduplicate en limiteer
    const unique = found.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.title === item.title && t.paragraphId === item.paragraphId)
    );

    return unique.slice(0, 8);
  }, [query, chapters]);

  const showResults = focused && query.trim().length >= 2;

  return (
    <div className="relative mx-auto max-w-xl">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Zoek een begrip, paragraaf of leerdoel..."
          className="w-full rounded-2xl border border-gres-blue/15 bg-white/90 dark:bg-gray-800/90 pl-12 pr-4 py-3.5 text-sm shadow-md backdrop-blur placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gres-blue/30 focus:border-gres-blue/30 transition-all"
        />
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-gres-blue/15 bg-white dark:bg-gray-800 shadow-xl">
          {results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Geen resultaten voor &quot;{query}&quot;
            </div>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto divide-y divide-gres-blue/10">
              {results.map((result, i) => (
                <li key={`${result.paragraphId}-${result.title}-${i}`}>
                  <Link
                    href={`/hoofdstuk/${result.chapterId}/${result.paragraphId}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gres-blue/5"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gres-yellow/20 text-xs">
                      {result.type === "concept" ? "📚" : "📖"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                      {result.type === "concept" && result.match && (
                        <p className="mt-0.5 text-xs text-muted-foreground/70 truncate">
                          {result.match}
                        </p>
                      )}
                    </div>
                    <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {result.type === "concept" ? "Begrip" : result.match}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
