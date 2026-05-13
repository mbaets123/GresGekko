"use client";

import { useState } from "react";
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
        <div className="h-1 w-8 rounded-full" style={{ background: "#E94E5B" }} />
        <h2 className="text-lg font-semibold">Toets-modus</h2>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-2xl border-2 border-dashed p-6 text-left transition-all hover:shadow-lg"
        style={{ borderColor: "#E94E5B40", background: "#E94E5B05" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E94E5B80"; (e.currentTarget as HTMLElement).style.background = "#E94E5B0C"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E94E5B40"; (e.currentTarget as HTMLElement).style.background = "#E94E5B05"; }}
      >
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl transition-transform group-hover:scale-110"
            style={{ background: "#E94E5B15" }}>
            📝
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: "#E94E5B" }}>
              Toets over {chapterTitle}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {questions.length} vragen · kies paragrafen, niveau en tijdslimiet
            </p>
          </div>
          <span className="ml-auto text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: "#E94E5B" }}>
            Start toets →
          </span>
        </div>
      </button>
    </section>
  );
}
