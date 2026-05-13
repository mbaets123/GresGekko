"use client";

import { useState } from "react";
import { ToetsMode } from "./ToetsMode";
import type { Question } from "@/types";

interface ChapterToetsSectionProps {
  questions: Question[];
  chapterTitle: string;
}

export function ChapterToetsSection({ questions, chapterTitle }: ChapterToetsSectionProps) {
  const [open, setOpen] = useState(false);

  if (questions.length === 0) return null;

  if (open) {
    return (
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <ToetsMode
          questions={questions}
          paragraphTitle={chapterTitle}
          onClose={() => setOpen(false)}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1 w-8 rounded-full bg-gres-blue" />
        <h2 className="text-lg font-semibold">Toets-modus</h2>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-2xl border-2 border-dashed border-gres-blue/30 bg-gres-blue/5 p-6 text-left transition-all hover:border-gres-blue/60 hover:bg-gres-blue/10 hover:shadow-lg"
      >
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gres-blue/10 text-3xl transition-transform group-hover:scale-110">
            📝
          </div>
          <div>
            <p className="text-base font-bold text-gres-blue">
              Toets over {chapterTitle}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {questions.length} vragen · kies je eigen tijdslimiet en moeilijkheidsgraad
            </p>
          </div>
          <span className="ml-auto text-sm font-medium text-gres-blue opacity-0 transition-opacity group-hover:opacity-100">
            Start toets →
          </span>
        </div>
      </button>
    </section>
  );
}
