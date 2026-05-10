"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { AIQuestionGenerator } from "./AIQuestionGenerator";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

const DIFFICULTY_LABELS = [
  { level: 1, label: "Reproductie", desc: "Je herhaalt wat je hebt geleerd", color: "from-green-400 to-emerald-500" },
  { level: 2, label: "Toepassing 1", desc: "Je gebruikt de stof in een bekende situatie", color: "from-blue-400 to-cyan-500" },
  { level: 3, label: "Toepassing 2", desc: "Je gebruikt de stof in een nieuwe situatie", color: "from-orange-400 to-amber-500" },
  { level: 4, label: "Inzicht", desc: "Je moet zelf verbanden leggen en nadenken", color: "from-purple-400 to-violet-500" },
];

/* ---------- Level button with balloon tooltip ---------- */
function LevelButton({
  level, label, desc, count, isActive, onClick, disabled,
}: {
  level: number; label: string; desc: string; count: number;
  isActive: boolean; onClick: () => void; disabled: boolean;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const openRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onTouch() { setIsTouch(true); window.removeEventListener("touchstart", onTouch); }
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouch);
      if (openRef.current) clearTimeout(openRef.current);
      if (closeRef.current) clearTimeout(closeRef.current);
    };
  }, []);

  const enter = useCallback(() => {
    if (isTouch) return;
    if (closeRef.current) clearTimeout(closeRef.current);
    openRef.current = setTimeout(() => {
      setTipOpen(true);
      requestAnimationFrame(() => setTipVisible(true));
    }, 120);
  }, [isTouch]);

  const leave = useCallback(() => {
    if (isTouch) return;
    if (openRef.current) clearTimeout(openRef.current);
    setTipVisible(false);
    closeRef.current = setTimeout(() => setTipOpen(false), 100);
  }, [isTouch]);

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "group relative overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-all",
          isActive
            ? "border-gres-blue bg-gres-blue text-white shadow-md"
            : "bg-card hover:shadow-sm hover:border-gres-blue/30",
          disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        <span className="text-xs mr-1">{"★".repeat(level)}</span>
        {label}
        <span className={cn(
          "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          isActive ? "bg-white/20" : "bg-muted"
        )}>
          {count}
        </span>
      </button>
      {tipOpen && (
        <span
          className={cn(
            "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-gres-blue px-3 py-2 text-xs font-normal text-white shadow-lg text-center transition-all duration-150 pointer-events-none",
            tipVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
        >
          {desc}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gres-blue" />
        </span>
      )}
    </div>
  );
}

interface QuestionSectionProps {
  questions: Question[];
  paragraphId: string;
}

export function QuestionSection({ questions, paragraphId }: QuestionSectionProps) {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCount, setAiCount] = useState(0);

  const handleAnswered = useCallback((id: string) => {
    setAnsweredIds((prev) => new Set(prev).add(id));
  }, []);

  if (questions.length === 0) {
    return (
      <section>
        <div className="mb-5 flex items-center gap-3">
          <div className="h-1 w-8 rounded-full bg-gres-yellow" />
          <h3 className="text-lg font-bold text-foreground">Oefenvragen</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          {/* AI generator card */}
          <button
            onClick={() => setAiOpen(true)}
            className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-gres-yellow/40 bg-gres-yellow/5 p-5 text-center transition-all hover:border-gres-yellow hover:bg-gres-yellow/15 hover:shadow-md"
          >
            <div className="mb-2 text-2xl transition-transform group-hover:scale-110">🦎</div>
            <p className="text-sm font-bold text-gres-blue">AI Vraag</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Genereer een nieuwe vraag</p>
          </button>
        </div>
        {aiOpen && (
          <AIQuestionGenerator paragraphId={paragraphId} startOpen onIdle={() => setAiOpen(false)} />
        )}
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
      </div>

      {/* Level filter tabs + AI button + progress */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {DIFFICULTY_LABELS.map(({ level, label, desc, color }) => {
          const count = questionsPerLevel.find((q) => q.level === level)?.questions.length || 0;
          const isActive = activeLevel === level;
          return (
            <LevelButton
              key={level}
              level={level}
              label={label}
              desc={desc}
              count={count}
              isActive={isActive}
              onClick={() => setActiveLevel(isActive ? null : level)}
              disabled={count === 0}
            />
          );
        })}
        {/* AI generate button */}
        <button
          onClick={() => setAiOpen(true)}
          className={cn(
            "group relative overflow-hidden rounded-full border-2 border-dashed border-gres-yellow/40 px-4 py-2 text-sm font-medium transition-all hover:border-gres-yellow hover:bg-gres-yellow/15 hover:shadow-md",
            aiOpen ? "border-gres-yellow bg-gres-yellow/15 shadow-md" : "bg-gres-yellow/5"
          )}
        >
          <span className="text-xs mr-1">🦎</span>
          AI Vraag
          {aiCount > 0 && (
            <span className="ml-1.5 rounded-full bg-gres-yellow/30 px-1.5 py-0.5 text-[10px] font-bold">
              {aiCount}
            </span>
          )}
        </button>
        {/* Progress bar — compact, right-aligned */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative h-2 w-24 overflow-hidden rounded-full bg-gres-blue/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gres-blue to-gres-blue-light transition-all duration-500 ease-out"
              style={{ width: `${questions.length > 0 ? (answeredIds.size / questions.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            {answeredIds.size}/{questions.length}
          </span>
        </div>
      </div>

      {/* Hint when no level selected and AI not open */}
      {!activeLevel && !aiOpen && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Klik op een niveau hierboven om de vragen te bekijken
        </p>
      )}

      {/* Questions with fade-in animation */}
      {filteredQuestions.length > 0 && !aiOpen && (
        <div key={activeLevel} className="space-y-4 animate-fade-in">
          {filteredQuestions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} onAnswered={handleAnswered} />
          ))}
        </div>
      )}

      {/* AI Question Generator — expanded below */}
      {aiOpen && (
        <AIQuestionGenerator paragraphId={paragraphId} startOpen onIdle={() => setAiOpen(false)} />
      )}
    </section>
  );
}
