"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ToetsMode } from "./ToetsMode";
import type { Question } from "@/types";

interface ChapterToetsSectionProps {
  questions: Question[];
  chapterTitle: string;
  paragraphs: { id: string; title: string }[];
}

export function ChapterToetsSection({ questions, chapterTitle, paragraphs }: ChapterToetsSectionProps) {
  const [open, setOpen] = useState(false);

  if (questions.length === 0) return null;

  if (open) {
    return (
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <ToetsMode
          questions={questions}
          paragraphTitle={chapterTitle}
          paragraphs={paragraphs}
          onClose={() => setOpen(false)}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1 w-8 rounded-full bg-[#E94E5B]" />
        <h2 className="text-lg font-semibold">Toets-modus</h2>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-2xl border border-[#E94E5B]/25 bg-[#E94E5B]/[0.06] text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#E94E5B]/40"
      >
        {/* Top colour bar — matches paragraph card behaviour */}
        <div className="absolute top-0 left-0 h-1 w-full bg-[#E94E5B] opacity-0 transition-opacity group-hover:opacity-100" />

        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E94E5B]/15 text-xl transition-transform group-hover:scale-110">
              📝
            </div>
          </div>
          <CardTitle className="text-base font-semibold text-[#E94E5B] transition-colors">
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
    </section>
  );
}
