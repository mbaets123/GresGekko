"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalize, isCloseEnough } from "@/lib/text-utils";
import type { Question } from "@/types";

/* ─── types ─────────────────────────────────────────────────── */

type Phase = "intro" | "questions" | "self-assess" | "results";

interface ToetsQuestion extends Question {
  shuffledOptions: string[] | undefined;
}

interface ToetsAnswer {
  questionId: string;
  studentAnswer: string;
  /** true/false for MC+fill-in; null = open (pending self-assess) */
  isCorrect: boolean | null;
  skipped: boolean;
}

interface ToetsModeProps {
  questions: Question[];
  paragraphTitle: string;
  onClose: () => void;
}

/* ─── constants ─────────────────────────────────────────────── */

const TIME_OPTIONS = [
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "25 min", seconds: 1500 },
];

const DIFF_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Reproductie", color: "text-green-600 dark:text-green-400" },
  2: { label: "Toepassen", color: "text-blue-600 dark:text-blue-400" },
  3: { label: "Nieuwe situaties", color: "text-orange-600 dark:text-orange-400" },
  4: { label: "Inzicht", color: "text-purple-600 dark:text-purple-400" },
};

/* ─── helpers ───────────────────────────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function calcCijfer(correct: number, total: number): number {
  if (total === 0) return 1;
  return Math.round(((correct / total) * 9 + 1) * 10) / 10;
}

function cijferColor(c: number): string {
  if (c >= 7) return "text-green-600 dark:text-green-400";
  if (c >= 5.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ─── component ─────────────────────────────────────────────── */

export function ToetsMode({ questions, paragraphTitle, onClose }: ToetsModeProps) {
  /* setup */
  const [phase, setPhase] = useState<Phase>("intro");
  const [timeLimitSec, setTimeLimitSec] = useState(900); // 15 min default
  const [selectedDiff, setSelectedDiff] = useState<number | "all">("all");

  /* test state */
  const [testQuestions, setTestQuestions] = useState<ToetsQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<ToetsAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  /* self-assess state */
  const [assessIdx, setAssessIdx] = useState(0);

  /* ── timer ── */
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startTimer = useCallback((seconds: number) => {
    setTimeLeft(seconds);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /* Timer hit 0: force-submit remaining questions */
  useEffect(() => {
    if (phase !== "questions" || timeLeft !== 0) return;
    stopTimer();
    setTimeTaken(timeLimitSec);

    // Mark current + remaining questions as skipped
    setAnswers((prev) => {
      const filled = [...prev];
      for (let i = filled.length; i < testQuestions.length; i++) {
        filled.push({
          questionId: testQuestions[i].id,
          studentAnswer: i === currentIdx ? currentAnswer : "",
          isCorrect: testQuestions[i].type === "open" ? null : false,
          skipped: true,
        });
      }
      return filled;
    });
    moveToNextPhase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  /* ── start test ── */
  function startTest() {
    const pool = selectedDiff === "all"
      ? questions
      : questions.filter((q) => q.difficulty === selectedDiff);

    if (pool.length === 0) return;

    const shuffled: ToetsQuestion[] = shuffle(pool).map((q) => ({
      ...q,
      shuffledOptions: q.options ? shuffle(q.options) : undefined,
    }));

    setTestQuestions(shuffled);
    setAnswers([]);
    setCurrentIdx(0);
    setCurrentAnswer("");
    startTimer(timeLimitSec);
    setPhase("questions");
  }

  /* ── submit answer for current question ── */
  function submitAnswer() {
    const q = testQuestions[currentIdx];
    if (!q) return;

    let isCorrect: boolean | null = null;
    if (q.type === "multiple-choice") {
      isCorrect = normalize(currentAnswer) === normalize(q.answer);
    } else if (q.type === "fill-in") {
      isCorrect = isCloseEnough(currentAnswer, q.answer);
    } else {
      isCorrect = null; // open: self-assess later
    }

    const newAnswer: ToetsAnswer = {
      questionId: q.id,
      studentAnswer: currentAnswer,
      isCorrect,
      skipped: !currentAnswer.trim(),
    };

    const updated = [...answers, newAnswer];
    setAnswers(updated);
    setCurrentAnswer("");

    if (currentIdx + 1 < testQuestions.length) {
      setCurrentIdx((i) => i + 1);
    } else {
      stopTimer();
      setTimeTaken(timeLimitSec - timeLeft);
      setAnswers(updated);
      moveToNextPhase(updated);
    }
  }

  /* ── determine what phase comes after questions ── */
  function moveToNextPhase(finalAnswers?: ToetsAnswer[]) {
    const ans = finalAnswers ?? answers;
    const hasOpen = ans.some((a) => a.isCorrect === null && !a.skipped);
    if (hasOpen) {
      setAssessIdx(0);
      setPhase("self-assess");
    } else {
      setPhase("results");
    }
  }

  /* ── self-assess: student thumbs-up/down their open answers ── */
  const openAnswers = answers
    .map((a, i) => ({ ...a, question: testQuestions.find((q) => q.id === a.questionId)!, idx: i }))
    .filter((a) => a.isCorrect === null && !a.skipped);

  function handleSelfAssess(correct: boolean) {
    const entry = openAnswers[assessIdx];
    setAnswers((prev) =>
      prev.map((a) => (a.questionId === entry.questionId ? { ...a, isCorrect: correct } : a))
    );
    if (assessIdx + 1 < openAnswers.length) {
      setAssessIdx((i) => i + 1);
    } else {
      setPhase("results");
    }
  }

  /* ── results calculation ── */
  const correctCount = answers.filter((a) => a.isCorrect === true).length;
  const skippedCount = answers.filter((a) => a.skipped).length;
  const cijfer = calcCijfer(correctCount, testQuestions.length);

  const diffBreakdown = [1, 2, 3, 4].map((d) => {
    const qs = testQuestions.filter((q) => q.difficulty === d);
    const correct = qs.filter((q) => {
      const a = answers.find((a) => a.questionId === q.id);
      return a?.isCorrect === true;
    }).length;
    return { diff: d, total: qs.length, correct };
  }).filter((d) => d.total > 0);

  const wrongAnswers = testQuestions
    .map((q) => ({ q, a: answers.find((a) => a.questionId === q.id) }))
    .filter(({ a }) => a && a.isCorrect === false);

  const [showReview, setShowReview] = useState(false);

  /* ── keyboard submit ── */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && currentAnswer.trim()) {
      e.preventDefault();
      submitAnswer();
    }
  }

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */

  /* ── INTRO ── */
  if (phase === "intro") {
    const pool = selectedDiff === "all"
      ? questions
      : questions.filter((q) => q.difficulty === selectedDiff);

    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/60 to-violet-50/40 dark:from-purple-950/30 dark:to-violet-950/20 p-6">

          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xl shadow-md">
              📝
            </div>
            <div>
              <h3 className="font-bold text-foreground">Toets-modus</h3>
              <p className="text-xs text-muted-foreground">{paragraphTitle}</p>
            </div>
          </div>

          {/* Tijdlimiet */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              ⏱ Tijdlimiet
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TIME_OPTIONS.map(({ label, seconds }) => (
                <button
                  key={seconds}
                  onClick={() => setTimeLimitSec(seconds)}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-semibold transition-all",
                    timeLimitSec === seconds
                      ? "border-purple-500 bg-purple-600 text-white shadow-md"
                      : "bg-card hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Niveau filter */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              🎯 Niveau
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[
                { value: "all" as const, label: "Alle niveaus", emoji: "🎲" },
                { value: 1, label: "★ Basis", emoji: "" },
                { value: 2, label: "★★ Toepassen", emoji: "" },
                { value: 3, label: "★★★ Uitdaging", emoji: "" },
                { value: 4, label: "★★★★ Expert", emoji: "" },
              ].map(({ value, label }) => {
                const count = value === "all"
                  ? questions.length
                  : questions.filter((q) => q.difficulty === value).length;
                return (
                  <button
                    key={String(value)}
                    onClick={() => setSelectedDiff(value)}
                    disabled={count === 0}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all disabled:opacity-40",
                      selectedDiff === value
                        ? "border-purple-500 bg-purple-600 text-white shadow-md"
                        : "bg-card hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                    )}
                  >
                    {label}
                    <span className="ml-1 opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spelregels */}
          <div className="mb-5 rounded-xl border border-purple-200 dark:border-purple-900 bg-white/60 dark:bg-gray-900/40 p-4 text-sm space-y-1.5">
            <p className="font-semibold text-foreground mb-2">📋 Spelregels</p>
            {[
              `${pool.length} vragen — door elkaar geschud`,
              "Geen feedback tijdens de toets",
              "Open vragen beoordeel je zelf achteraf",
              `Tijdslimiet: ${TIME_OPTIONS.find((t) => t.seconds === timeLimitSec)?.label} — bij nul worden resterende vragen overgeslagen`,
              "Je krijgt een cijfer op een schaal van 1 tot 10",
            ].map((rule, i) => (
              <p key={i} className="text-muted-foreground flex gap-2">
                <span className="text-purple-500 font-bold shrink-0">{i + 1}.</span>
                {rule}
              </p>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={startTest}
              disabled={pool.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              🚀 Start toets ({pool.length} vragen)
            </Button>
            <Button onClick={onClose} variant="outline" className="text-muted-foreground">
              Annuleren
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── QUESTIONS ── */
  if (phase === "questions") {
    const q = testQuestions[currentIdx];
    if (!q) return null;

    const pct = currentIdx / testQuestions.length;
    const timerUrgent = timeLeft > 0 && timeLeft <= 120;
    const timerAlmost = timeLeft > 0 && timeLeft <= 30;

    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/60 to-violet-50/40 dark:from-purple-950/30 dark:to-violet-950/20 p-5">

          {/* Top bar: timer + progress */}
          <div className="mb-4 flex items-center gap-3">
            {/* Timer */}
            <div className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums shrink-0 transition-colors",
              timerAlmost
                ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 animate-pulse"
                : timerUrgent
                  ? "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
                  : "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
            )}>
              <span>⏱</span>
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Progress bar */}
            <div className="flex flex-1 items-center gap-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-purple-100 dark:bg-purple-950/40">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                {currentIdx + 1}/{testQuestions.length}
              </span>
            </div>
          </div>

          {/* Question card */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className={cn("text-xs font-bold", DIFF_LABELS[q.difficulty]?.color)}>
                {"★".repeat(q.difficulty)} {DIFF_LABELS[q.difficulty]?.label}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                {q.type === "multiple-choice" && "Meerkeuze"}
                {q.type === "open" && "Open"}
                {q.type === "fill-in" && "Invul"}
              </span>
            </div>

            <p className="mb-4 text-[15px] font-medium leading-relaxed">{q.question}</p>

            <div className="space-y-3">
              {q.type === "multiple-choice" && q.shuffledOptions && (
                <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                  {q.shuffledOptions.map((option, i) => (
                    <label
                      key={i}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all hover:bg-purple-50 dark:hover:bg-purple-950/20",
                        currentAnswer === option && "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                      )}
                    >
                      <RadioGroupItem value={option} />
                      {option}
                    </label>
                  ))}
                </RadioGroup>
              )}

              {q.type === "fill-in" && (
                <Input
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Typ je antwoord..."
                  className="text-sm"
                  autoFocus
                />
              )}

              {q.type === "open" && (
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Schrijf je antwoord..."
                  className="min-h-[100px] text-sm"
                  autoFocus
                />
              )}

              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={submitAnswer}
                  disabled={!currentAnswer.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {currentIdx + 1 < testQuestions.length ? "Volgende →" : "Afronden ✓"}
                </Button>
                {/* Skip */}
                <button
                  onClick={() => {
                    setCurrentAnswer("");
                    submitAnswer();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Overslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── SELF-ASSESS (open questions) ── */
  if (phase === "self-assess") {
    const entry = openAnswers[assessIdx];
    if (!entry) return null;
    const q = entry.question;

    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/60 to-yellow-50/40 dark:from-amber-950/30 dark:to-yellow-950/20 p-5">

          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <div>
                <p className="text-sm font-bold text-foreground">Beoordeel je eigen antwoord</p>
                <p className="text-xs text-muted-foreground">Open vraag {assessIdx + 1} van {openAnswers.length}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {openAnswers.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    i < assessIdx ? "bg-amber-400" : i === assessIdx ? "bg-amber-600" : "bg-amber-200 dark:bg-amber-800"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <p className="font-medium leading-relaxed text-[15px]">{q.question}</p>

            {/* Student answer */}
            <div className="rounded-xl border border-gres-blue/15 bg-gres-blue/5 p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Jouw antwoord
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {entry.studentAnswer || <span className="italic text-muted-foreground">— overgeslagen —</span>}
              </p>
            </div>

            {/* Example answer */}
            <div className="rounded-xl border border-gres-yellow/30 bg-gres-yellow/10 p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gres-blue">
                Voorbeeldantwoord
              </p>
              <p className="text-sm text-foreground/80">{q.answer}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Telt jouw antwoord de belangrijkste punten? Wees eerlijk.
            </p>

            {/* Self-assess buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleSelfAssess(true)}
                className="flex-1 rounded-xl border-2 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 px-4 py-3 text-sm font-semibold text-green-700 dark:text-green-400 transition-all hover:bg-green-100 dark:hover:bg-green-950/50 hover:shadow-sm active:scale-95"
              >
                👍 Goed genoeg
              </button>
              <button
                onClick={() => handleSelfAssess(false)}
                className="flex-1 rounded-xl border-2 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-400 transition-all hover:bg-red-100 dark:hover:bg-red-950/50 hover:shadow-sm active:scale-95"
              >
                👎 Niet voldoende
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── RESULTS ── */
  if (phase === "results") {
    const passed = cijfer >= 5.5;

    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/60 to-violet-50/40 dark:from-purple-950/30 dark:to-violet-950/20 p-6">

          {/* Big grade */}
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Jouw cijfer
            </p>
            <p className={cn("text-7xl font-black tabular-nums", cijferColor(cijfer))}>
              {cijfer.toFixed(1)}
            </p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {passed ? "✅ Voldoende!" : "❌ Onvoldoende"}
            </p>
          </div>

          {/* Stats row */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Correct", value: `${correctCount}/${testQuestions.length}`, icon: "✅" },
              { label: "Overgeslagen", value: String(skippedCount), icon: "⏭️" },
              { label: "Tijd", value: formatTime(timeTaken), icon: "⏱️" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl border bg-card p-3 text-center">
                <p className="text-lg mb-0.5">{icon}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* Per-level breakdown */}
          <div className="mb-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Per niveau
            </p>
            {diffBreakdown.map(({ diff, total, correct }) => {
              const pct = total > 0 ? correct / total : 0;
              const { label, color } = DIFF_LABELS[diff];
              return (
                <div key={diff} className="flex items-center gap-3">
                  <span className={cn("text-xs font-semibold w-32 shrink-0", color)}>
                    {"★".repeat(diff)} {label}
                  </span>
                  <div className="relative flex-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                        pct >= 0.7 ? "bg-green-500" : pct >= 0.5 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground w-10 text-right shrink-0">
                    {correct}/{total}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Review wrong answers */}
          {wrongAnswers.length > 0 && (
            <div className="mb-5">
              <button
                onClick={() => setShowReview(!showReview)}
                className="flex w-full items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/20 px-4 py-3 text-left text-sm font-semibold text-red-700 dark:text-red-400 transition-colors hover:bg-red-100/60 dark:hover:bg-red-950/30"
              >
                <span className={cn("text-xs transition-transform", showReview && "rotate-90")}>▶</span>
                Bekijk {wrongAnswers.length} fout{wrongAnswers.length !== 1 ? "e" : ""} vraag{wrongAnswers.length !== 1 ? "en" : ""}
              </button>

              {showReview && (
                <div className="mt-3 space-y-3 animate-fade-in">
                  {wrongAnswers.map(({ q, a }) => (
                    <div key={q.id} className="rounded-xl border border-red-200 dark:border-red-900 bg-card p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold", DIFF_LABELS[q.difficulty]?.color)}>
                          {"★".repeat(q.difficulty)} {DIFF_LABELS[q.difficulty]?.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{q.question}</p>

                      {a?.studentAnswer && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 p-2.5">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">Jouw antwoord</p>
                          <p className="text-sm text-foreground/70">{a.studentAnswer}</p>
                        </div>
                      )}

                      <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 p-2.5">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">Goed antwoord</p>
                        <p className="text-sm text-foreground/80 font-medium">{q.answer}</p>
                      </div>

                      <div className="rounded-lg bg-gres-yellow/10 border border-gres-yellow/20 p-2.5">
                        <p className="text-[10px] font-bold uppercase text-gres-blue mb-0.5">Uitleg</p>
                        <p className="text-sm text-foreground/70 leading-relaxed">{q.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setPhase("intro");
                setShowReview(false);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              🔄 Opnieuw
            </Button>
            <Button onClick={onClose} variant="outline" className="text-muted-foreground">
              Terug naar vragen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
