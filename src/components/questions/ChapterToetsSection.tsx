"use client";

import { useState, type ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ToetsMode } from "./ToetsMode";
import type { Question } from "@/types";

interface ChapterToetsSectionProps {
  questions: Question[];
  chapterTitle: string;
  paragraphs: { id: string; title: string }[];
  /** The paragraph Link/Card elements rendered by the server component */
  children: ReactNode;
}

export function ChapterToetsSection({
  questions,
  chapterTitle,
  paragraphs,
  children,
}: ChapterToetsSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {children}

        {/* Toets-modus card — same style as paragraph cards but red */}
        {questions.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="group relative h-full overflow-hidden rounded-2xl border border-[#E94E5B]/25 bg-[#E94E5B]/[0.08] text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#E94E5B]/40"
          >
            {/* Top colour bar */}
            <div className="absolute top-0 left-0 h-1 w-full bg-[#E94E5B] opacity-0 transition-opacity group-hover:opacity-100" />

            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E94E5B]/15 text-xl">
                  📝
                </div>
                <span className="rounded-full bg-[#E94E5B]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E94E5B]">
                  Toets
                </span>
              </div>
              <CardTitle className="text-base font-semibold text-[#E94E5B]/80 transition-colors group-hover:text-[#E94E5B]">
                Toets-modus
              </CardTitle>
              <CardDescription className="text-sm">
                {questions.length} vragen · kies paragrafen, niveau en tijdslimiet
              </CardDescription>
              <span className="mt-3 inline-flex text-xs font-medium text-[#E94E5B]/50 transition-colors group-hover:text-[#E94E5B]">
                Start toets →
              </span>
            </CardHeader>
          </button>
        )}
      </div>

      {/* ToetsMode expands below the grid when open */}
      {open && (
        <div className="mt-5">
          <ToetsMode
            questions={questions}
            paragraphTitle={chapterTitle}
            paragraphs={paragraphs}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
