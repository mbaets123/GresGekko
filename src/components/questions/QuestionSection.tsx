"use client";

import { useState } from "react";
import { QuestionCard } from "./QuestionCard";
import { AIQuestionGenerator } from "./AIQuestionGenerator";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

const DIFFICULTY_LABELS = [
  { level: 1, label: "Reproductie", desc: "Kennis onthouden", color: "from-green-400 to-emerald-500" },
  { level: 2, label: "Toepassen", desc: "Geoefende situaties", color: "from-blue-400 to-cyan-500" },
  { level: 3, label: "Nieuwe situaties", desc: "Onbekende contexten", color: "from-orange-400 to-amber-500" },
  { level: 4, label: "Inzicht", desc: "Verbanden leggen", color: "from-purple-400 to-violet-500" },
];

interface QuestionSectionProps {
  questions: Question[];
  paragraphId: string;
}

export function QuestionSection({ questions, paragraphId }: QuestionSectionProps) {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

  if (questions.length === 0) {
    return (
      <section>
        <div className="mb-5 flex items-center gap-3">
          <div className="h-1 w-8 rounded-full bg-gres-yellow" />
          <h3 className="text-lg font-bold text-foreground">Oefenvragen</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DIFFICULTY_LABELS.map(({ level, label, desc, color }) => (
            <div
              key={level}
              className="group relative overflow-hidden rounded-2xl border bg-card p-5 text-center"
            >
              <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${color}`} />
              <div className="mb-2 text-xl text-gres-yellow">
                {"★".repeat(level)}
                <span className="text-gres-blue/15">{"★".repeat(4 - level)}</span>
              </div>
              <p className="text-sm font-bold text-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
              <p className="mt-3 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Binnenkort
              </p>
            </div>
          ))}
        </div>
        <AIQuestionGenerator paragraphId={paragraphId} />
      </section>
    );
  }

  const questionsPerLevel = DIFFICULTY_LABELS.map(({ level }) => ({
    level,
    questions: questions.filter((q) => q.difficulty === level),
  }));

  const filteredQuestions = activeLevel
    ? questions.filter((q) => q.difficulty === activeLevel)
    : [];

  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1 w-8 rounded-full bg-gres-yellow" />
        <h3 className="text-lg font-bold text-foreground">Oefenvragen</h3>
        <span className="rounded-full bg-gres-blue/10 px-2.5 py-0.5 text-xs font-semibold text-gres-blue">
          {questions.length} vragen
        </span>
      </div>

      {/* Level filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {DIFFICULTY_LABELS.map(({ level, label, color }) => {
          const count = questionsPerLevel.find((q) => q.level === level)?.questions.length || 0;
          const isActive = activeLevel === level;
          return (
            <button
              key={level}
              onClick={() => setActiveLevel(isActive ? null : level)}
              className={cn(
                "group relative overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "border-gres-blue bg-gres-blue text-white shadow-md"
                  : "bg-card hover:shadow-sm hover:border-gres-blue/30",
                count === 0 && "opacity-40 cursor-not-allowed"
              )}
              disabled={count === 0}
              title={`${label} — ${count} ${count === 1 ? "vraag" : "vragen"}`}
            >
              <span className="text-xs mr-1">
                {"★".repeat(level)}
              </span>
              {label}
              <span className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                isActive ? "bg-white/20" : "bg-muted"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hint when no level selected */}
      {!activeLevel && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Klik op een niveau hierboven om de vragen te bekijken
        </p>
      )}

      {/* Questions with fade-in animation */}
      {filteredQuestions.length > 0 && (
        <div key={activeLevel} className="space-y-4 animate-fade-in">
          {filteredQuestions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} />
          ))}
        </div>
      )}

      {/* AI Question Generator */}
      <AIQuestionGenerator paragraphId={paragraphId} />
    </section>
  );
}
