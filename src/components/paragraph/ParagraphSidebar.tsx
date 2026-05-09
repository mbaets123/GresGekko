"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/types";

interface ParagraphSidebarProps {
  chapter: Chapter;
}

export function ParagraphSidebar({ chapter }: ParagraphSidebarProps) {
  const params = useParams();
  const activeParagraphId = params.paragraphId as string;
  const [open, setOpen] = useState(false);

  const activeParagraph = chapter.paragraphs.find(
    (p) => p.id === activeParagraphId
  );

  return (
    <div className="md:sticky md:top-20 z-30">
      {/* Collapsed: small vertical tab */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-2xl bg-gres-blue px-3 py-3 shadow-lg transition-all hover:shadow-xl",
          open ? "w-72" : "w-12 md:w-14"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm text-white transition-transform duration-200",
            open && "rotate-180"
          )}
        >
          {open ? "✕" : "☰"}
        </span>
        {open && (
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gres-yellow">
              Hoofdstuk {chapter.order}
            </p>
            <h2 className="truncate font-heading text-sm tracking-wide text-white">
              {chapter.title}
            </h2>
          </div>
        )}
      </button>

      {/* Expanded panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <nav className="relative z-30 mt-2 w-72 rounded-2xl border border-gres-blue/10 bg-card p-3 shadow-xl">
            {/* Current paragraph indicator */}
            {activeParagraph && (
              <div className="mb-3 rounded-xl bg-gres-blue/5 px-3 py-2 text-xs text-muted-foreground">
                Nu bij: <span className="font-semibold text-gres-blue">§ {chapter.order}.{activeParagraph.order} {activeParagraph.title}</span>
              </div>
            )}
            <ul className="space-y-1 max-h-[400px] overflow-y-auto">
              {chapter.paragraphs.map((paragraph) => {
                const isActive = activeParagraphId === paragraph.id;
                return (
                  <li key={paragraph.id}>
                    <Link
                      href={`/hoofdstuk/${chapter.id}/${paragraph.id}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                        isActive
                          ? "bg-gres-yellow/20 font-semibold text-gres-blue shadow-sm border border-gres-yellow/30"
                          : "text-muted-foreground hover:bg-gres-blue/5 hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          isActive
                            ? "bg-gres-blue text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {chapter.order}.{paragraph.order}
                      </span>
                      {paragraph.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 border-t border-gres-blue/10 pt-3 px-1">
              <Link
                href={`/hoofdstuk/${chapter.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gres-blue/5 px-3 py-2 text-xs font-medium text-gres-blue transition hover:bg-gres-blue/10"
              >
                ← Terug naar overzicht
              </Link>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
