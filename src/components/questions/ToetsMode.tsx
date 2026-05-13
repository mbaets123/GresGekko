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

type Phase = "intro" | "questions" | "ai-assess" | "results";

interface ToetsQuestion extends Question {
  shuffledOptions: string[] | undefined;
}

interface ToetsAnswer {
  questionId: string;
  studentAnswer: string;
  /** 0 = fout, 0.5 = deels goed, 1 = goed, null = open/wacht op AI */
  score: number | null;
  skipped: boolean;
  aiFeedback?: string;
  aiTip?: string;
}

interface SavedTestState {
  testQuestions: ToetsQuestion[];
  currentIdx: number;
  answers: ToetsAnswer[];
  timeLeft: number;
  timeLimitSec: number;
}

interface ToetsModeProps {
  questions: Question[];
  paragraphTitle: string;
  paragraphs?: { id: string; title: string }[];
  onClose: () => void;
}

/* ─── constants ─────────────────────────────────────────────── */

const C           = "#E94E5B";
const BATCH_SIZE  = 3; // parallel AI calls per batch (rate-limit safe)

const TIME_OPTIONS = [
  { label: "5 min",  seconds: 300  },
  { label: "10 min", seconds: 600  },
  { label: "15 min", seconds: 900  },
  { label: "20 min", seconds: 1200 },
  { label: "25 min", seconds: 1500 },
];

const DIFF_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Reproductie",      color: "text-green-600 dark:text-green-400"   },
  2: { label: "Toepassen",        color: "text-[#E94E5B]"                      },
  3: { label: "Nieuwe situaties", color: "text-orange-600 dark:text-orange-400" },
  4: { label: "Inzicht",          color: "text-purple-600 dark:text-purple-400" },
};

/* ─── helpers ───────────────────────────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function calcCijfer(points: number, total: number): number {
  if (total === 0) return 1;
  return Math.round(((points / total) * 9 + 1) * 10) / 10;
}

// ✅ FIX 9: 10.0 → "10", 7.5 → "7,5"
function formatCijfer(c: number): string {
  return (c % 1 === 0 ? c.toFixed(0) : c.toFixed(1)).replace(".", ",");
}

function cijferColor(c: number): string {
  if (c >= 7)   return "text-green-600 dark:text-green-400";
  if (c >= 5.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function formatTime(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ─── component ─────────────────────────────────────────────── */

export function ToetsMode({ questions, paragraphTitle, paragraphs, onClose }: ToetsModeProps) {

  /* paragraph info */
  const allParagraphIds = [...new Set(questions.map(q => q.paragraphId))];
  const showParagraphFilter = allParagraphIds.length > 1;
  const paragraphsInfo = paragraphs
    ? paragraphs.filter(p => allParagraphIds.includes(p.id))
    : allParagraphIds.map(id => ({ id, title: id }));

  // ✅ FIX 7: localStorage key per toets
  const saveKey = `biobuffel-toets-${paragraphTitle.slice(0, 60)}`;

  /* ── setup state ── */
  const [phase, setPhase]               = useState<Phase>("intro");
  const [timeLimitSec, setTimeLimitSec] = useState(900);
  const [selectedDiff, setSelectedDiff] = useState<number | "all">("all");
  const [selectedParagraphs, setSelectedParagraphs] = useState<Set<string>>(
    () => new Set(allParagraphIds)
  );
  // ✅ FIX 7: saved state from localStorage
  const [savedState, setSavedState] = useState<SavedTestState | null>(null);

  /* ── test state ── */
  const [testQuestions, setTestQuestions] = useState<ToetsQuestion[]>([]);
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [answers, setAnswers]             = useState<ToetsAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeLeft, setTimeLeft]           = useState(0);
  const [timeTaken, setTimeTaken]         = useState(0);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const assessRunning = useRef(false);
  const timeLeftRef   = useRef(0); // always-current time for saving

  /* ── ai-assess state ── */
  const [assessProgress, setAssessProgress] = useState(0);
  const [assessTotal,    setAssessTotal]    = useState(0);

  /* ── results/confirm state ── */
  const [showReview,   setShowReview]   = useState(false);
  const [stoppedEarly, setStoppedEarly] = useState(false);
  // ✅ FIX 2: stop confirmation
  const [stopConfirm, setStopConfirm] = useState(false);

  /* ── timer ── */
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startTimer = useCallback((seconds: number) => {
    timeLeftRef.current = seconds;
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev <= 1 ? 0 : prev - 1;
        timeLeftRef.current = next;
        if (next === 0) clearInterval(timerRef.current!);
        return next;
      });
    }, 1000);
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ✅ FIX 7: load saved state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) return;
      const data = JSON.parse(raw) as SavedTestState;
      if (Array.isArray(data.testQuestions) && data.testQuestions.length > 0) {
        setSavedState(data);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ FIX 7: clear saved state when results are shown
  useEffect(() => {
    if (phase === "results") {
      try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
    }
  }, [phase, saveKey]);

  /* ── timer hit 0: auto-submit remaining ── */
  useEffect(() => {
    if (phase !== "questions" || timeLeft !== 0) return;
    stopTimer();
    setTimeTaken(timeLimitSec);

    const filled = [...answers];
    for (let i = filled.length; i < testQuestions.length; i++) {
      const sa = i === currentIdx ? currentAnswer : "";
      filled.push({
        questionId:    testQuestions[i].id,
        studentAnswer: sa,
        // ✅ FIX 6: open with text still gets AI eval even when time runs out
        score:         testQuestions[i].type === "open" && sa.trim() ? null : 0,
        skipped:       true,
      });
    }
    setAnswers(filled);
    try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
    moveToNextPhase(filled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  /* ── pool ── */
  function getPool(): Question[] {
    return questions.filter(q => {
      const diffOk = selectedDiff === "all" || q.difficulty === selectedDiff;
      const paraOk = selectedParagraphs.size === 0 || selectedParagraphs.has(q.paragraphId);
      return diffOk && paraOk;
    });
  }

  /* ✅ FIX 7: save progress to localStorage */
  function saveProgress(updatedAnswers: ToetsAnswer[], nextIdx: number) {
    try {
      localStorage.setItem(saveKey, JSON.stringify({
        testQuestions,
        currentIdx: nextIdx,
        answers:    updatedAnswers,
        timeLeft:   timeLeftRef.current,
        timeLimitSec,
      } satisfies SavedTestState));
    } catch { /* ignore quota errors */ }
  }

  /* ── start test ── */
  function startTest() {
    const pool = getPool();
    if (pool.length === 0) return;
    const shuffled: ToetsQuestion[] = shuffle(pool).map(q => ({
      ...q,
      shuffledOptions: q.options ? shuffle(q.options) : undefined,
    }));
    setTestQuestions(shuffled);
    setAnswers([]);
    setCurrentIdx(0);
    setCurrentAnswer("");
    setStoppedEarly(false);
    setStopConfirm(false);
    setSavedState(null);
    assessRunning.current = false;
    try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
    startTimer(timeLimitSec);
    setPhase("questions");
  }

  /* ✅ FIX 7: resume saved test */
  function handleResume(state: SavedTestState) {
    setTestQuestions(state.testQuestions);
    setAnswers(state.answers);
    setCurrentIdx(state.currentIdx);
    setCurrentAnswer("");
    setStoppedEarly(false);
    setStopConfirm(false);
    setSavedState(null);
    assessRunning.current = false;
    try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
    startTimer(state.timeLeft);
    setPhase("questions");
  }

  /* ✅ FIX 2: stop with confirmation — called after user confirms */
  function doStopTest() {
    stopTimer();
    setTimeTaken(timeLimitSec - timeLeftRef.current);
    setStoppedEarly(true);
    setStopConfirm(false);
    try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
    moveToNextPhase(answers);
  }

  /* ── submit answer ── */
  function submitAnswer() {
    const q = testQuestions[currentIdx];
    if (!q) return;

    let score: number | null;
    if      (q.type === "multiple-choice") score = normalize(currentAnswer) === normalize(q.answer) ? 1 : 0;
    else if (q.type === "fill-in")         score = isCloseEnough(currentAnswer, q.answer) ? 1 : 0;
    else                                   score = currentAnswer.trim() ? null : 0;

    const updated = [...answers, { questionId: q.id, studentAnswer: currentAnswer, score, skipped: false }];
    setAnswers(updated);
    setCurrentAnswer("");
    setStopConfirm(false);

    if (currentIdx + 1 < testQuestions.length) {
      saveProgress(updated, currentIdx + 1);
      setCurrentIdx(i => i + 1);
    } else {
      stopTimer();
      setTimeTaken(timeLimitSec - timeLeftRef.current);
      try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
      moveToNextPhase(updated);
    }
  }

  /* ── skip ── */
  function handleSkip() {
    const q = testQuestions[currentIdx];
    if (!q) return;
    // ✅ FIX 6: open question with typed text → still evaluate with AI (score=null, skipped=true for display)
    const hasText = q.type === "open" && currentAnswer.trim();
    const updated = [...answers, {
      questionId:    q.id,
      studentAnswer: currentAnswer,
      score:         hasText ? null : (0 as number | null),
      skipped:       true,
    }];
    setAnswers(updated);
    setCurrentAnswer("");
    setStopConfirm(false);

    if (currentIdx + 1 < testQuestions.length) {
      saveProgress(updated, currentIdx + 1);
      setCurrentIdx(i => i + 1);
    } else {
      stopTimer();
      setTimeTaken(timeLimitSec - timeLeftRef.current);
      try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
      moveToNextPhase(updated);
    }
  }

  /* ✅ FIX 4: go back to previous question */
  function handleGoBack() {
    if (currentIdx === 0) return;
    setStopConfirm(false);
    const prevIdx = currentIdx - 1;
    const prevQ   = testQuestions[prevIdx];
    const prevAns = answers.find(a => a.questionId === prevQ.id);
    setAnswers(prev => prev.filter(a => a.questionId !== prevQ.id));
    setCurrentAnswer(prevAns?.studentAnswer ?? "");
    setCurrentIdx(prevIdx);
  }

  /* ── phase transition ── */
  function moveToNextPhase(finalAnswers: ToetsAnswer[]) {
    // ✅ FIX 6: evaluate ALL null-score answers (including skipped-with-text)
    const hasOpen = finalAnswers.some(a => a.score === null);
    if (hasOpen) {
      setPhase("ai-assess");
      runAiAssessment(finalAnswers);
    } else {
      setPhase("results");
    }
  }

  /* ✅ FIX 3: single evaluation with retry on 429 */
  async function evaluateOne(
    entry: ToetsAnswer,
    q: ToetsQuestion,
  ): Promise<{ score: number; feedback?: string; tip?: string }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("/api/evaluate-answer", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            question:      q.question,
            correctAnswer: q.answer,
            studentAnswer: entry.studentAnswer,
            paragraphId:   q.paragraphId,
          }),
        });
        if (res.status === 429) {
          // ✅ FIX 3: rate limited — exponential back-off
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        if (res.ok) {
          const { evaluation: ev } = await res.json();
          return {
            score:    ev.score === "goed" ? 1 : ev.score === "deels" ? 0.5 : 0,
            feedback: ev.feedback,
            tip:      ev.tip || undefined,
          };
        }
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }
    return { score: 0 };
  }

  /* ✅ FIX 1: parallel batched AI evaluation */
  async function runAiAssessment(finalAnswers: ToetsAnswer[]) {
    if (assessRunning.current) return;
    assessRunning.current = true;

    const toAssess = finalAnswers.filter(a => a.score === null);
    setAssessTotal(toAssess.length);
    setAssessProgress(0);

    let current = [...finalAnswers];

    for (let i = 0; i < toAssess.length; i += BATCH_SIZE) {
      const batch = toAssess.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async entry => {
          const q = testQuestions.find(tq => tq.id === entry.questionId);
          if (!q) return { id: entry.questionId, score: 0 as number, feedback: undefined, tip: undefined };
          const r = await evaluateOne(entry, q);
          return { id: entry.questionId, ...r };
        })
      );

      for (const r of results) {
        current = current.map(a =>
          a.questionId === r.id
            ? { ...a, score: r.score, aiFeedback: r.feedback, aiTip: r.tip }
            : a
        );
      }

      setAssessProgress(p => p + batch.length);
      setAnswers([...current]);

      // Small pause between batches to respect rate limits
      if (i + BATCH_SIZE < toAssess.length) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    assessRunning.current = false;
    setPhase("results");
  }

  /* ── paragraph toggle ── */
  function toggleParagraph(id: string) {
    setSelectedParagraphs(prev => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── results helpers ── */
  const totalPoints       = answers.reduce((s, a) => s + (a.score ?? 0), 0);
  const fullyCorrectCount = answers.filter(a => a.score === 1).length;
  const partialCount      = answers.filter(a => a.score === 0.5).length;
  const skippedCount      = answers.filter(a => a.skipped).length;
  const gradeDenominator  = stoppedEarly ? answers.length : testQuestions.length;
  const cijfer            = calcCijfer(totalPoints, gradeDenominator);

  const diffBreakdown = [1, 2, 3, 4].map(d => {
    const qs  = stoppedEarly
      ? testQuestions.filter(q => q.difficulty === d && answers.some(a => a.questionId === q.id))
      : testQuestions.filter(q => q.difficulty === d);
    const pts = qs.reduce((s, q) => s + (answers.find(a => a.questionId === q.id)?.score ?? 0), 0);
    return { diff: d, total: qs.length, pts };
  }).filter(d => d.total > 0);

  const reviewAnswers = testQuestions
    .map(q => ({ q, a: answers.find(a => a.questionId === q.id) }))
    .filter(({ a }) => a && (a.score ?? 0) < 1);

  /* ── keyboard ── */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && currentAnswer.trim()) {
      e.preventDefault();
      submitAnswer();
    }
  }

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */

  /* ── INTRO ── */
  if (phase === "intro") {
    const pool = getPool();

    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 p-6"
          style={{ borderColor: `${C}30`, background: `linear-gradient(135deg, ${C}06 0%, ${C}02 100%)` }}>

          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-white shadow-md"
              style={{ background: C }}>
              🦬
            </div>
            <div>
              <h3 className="font-bold text-foreground">Toets-modus</h3>
              <p className="text-xs text-muted-foreground">{paragraphTitle}</p>
            </div>
            <button onClick={onClose}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
              ✕ Sluiten
            </button>
          </div>

          {/* ✅ FIX 7: Resume saved test prompt */}
          {savedState && (
            <div className="mb-5 rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3"
              style={{ borderColor: `${C}30`, background: `${C}08` }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: C }}>
                  💾 Onafgemaakte toets gevonden
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {savedState.answers.length} van {savedState.testQuestions.length} vragen beantwoord
                  · {formatTime(savedState.timeLeft)} over
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button onClick={() => handleResume(savedState)} size="sm"
                  className="text-white hover:opacity-90"
                  style={{ background: C, border: "none" }}>
                  Hervatten
                </Button>
                <Button onClick={() => {
                    try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
                    setSavedState(null);
                  }}
                  size="sm" variant="outline" className="text-muted-foreground text-xs">
                  Negeren
                </Button>
              </div>
            </div>
          )}

          {/* Tijdlimiet */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">⏱ Tijdlimiet</p>
            <div className="grid grid-cols-5 gap-2">
              {TIME_OPTIONS.map(({ label, seconds }) => (
                <button key={seconds} onClick={() => setTimeLimitSec(seconds)}
                  className={cn("rounded-xl border py-2.5 text-sm font-semibold transition-all",
                    timeLimitSec === seconds ? "text-white shadow-md" : "bg-card")}
                  style={timeLimitSec === seconds
                    ? { background: C, borderColor: C }
                    : { borderColor: `${C}35` }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Paragrafen filter */}
          {showParagraphFilter && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">📚 Paragrafen</p>
                <button onClick={() => setSelectedParagraphs(new Set(allParagraphIds))}
                  className="text-[10px] font-medium hover:opacity-70 transition-opacity"
                  style={{ color: C }}>
                  Alles selecteren
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {paragraphsInfo.map(p => {
                  const count   = questions.filter(q => q.paragraphId === p.id).length;
                  const checked = selectedParagraphs.has(p.id);
                  return (
                    <label key={p.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all select-none",
                        checked ? "text-white" : "bg-card hover:opacity-80"
                      )}
                      style={checked ? { background: C, borderColor: C } : { borderColor: `${C}30` }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleParagraph(p.id)}
                        disabled={checked && selectedParagraphs.size === 1}
                        className="shrink-0 accent-white" />
                      <span className="font-medium truncate flex-1">{p.title}</span>
                      <span className={cn("text-[10px] shrink-0", checked ? "opacity-70" : "text-muted-foreground")}>
                        {count}v
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Niveau filter */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">🎯 Niveau</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {([
                { value: "all" as const, label: "Alle niveaus" },
                { value: 1, label: "★ Basis"       },
                { value: 2, label: "★★ Toepassen"  },
                { value: 3, label: "★★★ Uitdaging" },
                { value: 4, label: "★★★★ Expert"  },
              ] as const).map(({ value, label }) => {
                const count = value === "all"
                  ? questions.filter(q => selectedParagraphs.has(q.paragraphId)).length
                  : questions.filter(q => q.difficulty === value && selectedParagraphs.has(q.paragraphId)).length;
                return (
                  <button key={String(value)} onClick={() => setSelectedDiff(value)}
                    disabled={count === 0}
                    className={cn("rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all disabled:opacity-40",
                      selectedDiff === value ? "text-white shadow-md" : "bg-card")}
                    style={selectedDiff === value
                      ? { background: C, borderColor: C }
                      : { borderColor: `${C}30` }}>
                    {label}
                    <span className="ml-1 opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spelregels */}
          <div className="mb-5 rounded-xl border p-4 text-sm space-y-1.5 bg-white/60 dark:bg-gray-900/40"
            style={{ borderColor: `${C}20` }}>
            <p className="font-semibold text-foreground mb-2">📋 Spelregels</p>
            {[
              `${pool.length} vragen — door elkaar geschud`,
              "Geen feedback tijdens de toets",
              "Open vragen worden beoordeeld door Buffy: niet goed (0pt) / deels goed (0,5pt) / goed (1pt)",
              `Tijdlimiet: ${TIME_OPTIONS.find(t => t.seconds === timeLimitSec)?.label} — bij nul worden resterende vragen overgeslagen`,
              "Je kunt één vraag teruggaan en de toets vroegtijdig stoppen",
            ].map((rule, i) => (
              <p key={i} className="text-muted-foreground flex gap-2">
                <span className="font-bold shrink-0" style={{ color: C }}>{i + 1}.</span>
                {rule}
              </p>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={startTest} disabled={pool.length === 0}
              className="flex-1 text-white font-semibold hover:opacity-90 transition-opacity"
              style={{ background: C, border: "none" }}>
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
    const q           = testQuestions[currentIdx];
    if (!q) return null;
    const pct         = currentIdx / testQuestions.length;
    const timerUrgent = timeLeft > 0 && timeLeft <= 120;
    const timerAlmost = timeLeft > 0 && timeLeft <= 30;

    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 p-5"
          style={{ borderColor: `${C}30`, background: `linear-gradient(135deg, ${C}06 0%, ${C}02 100%)` }}>

          {/* Top bar: timer + progress counter */}
          <div className="mb-3 flex items-center gap-3">
            <div className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums shrink-0 transition-colors",
                timerAlmost ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 animate-pulse"
                  : timerUrgent ? "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
                    : "")}
              style={!timerAlmost && !timerUrgent ? { background: `${C}18`, color: C } : {}}>
              <span>⏱</span>
              <span>{formatTime(timeLeft)}</span>
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: `${C}15` }}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{ width: `${pct * 100}%`, background: C }} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                {currentIdx + 1}/{testQuestions.length}
              </span>
            </div>
          </div>

          {/* ✅ FIX 5: progress dots — one per question */}
          <div className="mb-4 flex flex-wrap gap-1">
            {testQuestions.map((tq, i) => {
              const a           = answers.find(ans => ans.questionId === tq.id);
              const isCurrent   = i === currentIdx;
              const isAnswered  = !!a && !a.skipped;
              const isSkipped   = a?.skipped;
              return (
                <div key={tq.id}
                  className={cn("h-2 w-2 rounded-full shrink-0 transition-all duration-200",
                    isCurrent ? "scale-150" : "")}
                  style={{
                    background: isCurrent   ? C
                      : isSkipped           ? "#d1d5db"
                      : isAnswered          ? `${C}55`
                      : "#e5e7eb",
                    boxShadow: isCurrent ? `0 0 0 2px white, 0 0 0 3.5px ${C}` : undefined,
                  }}
                />
              );
            })}
          </div>

          {/* Question card */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className={cn("text-xs font-bold", DIFF_LABELS[q.difficulty]?.color)}>
                {"★".repeat(q.difficulty)} {DIFF_LABELS[q.difficulty]?.label}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                {q.type === "multiple-choice" ? "Meerkeuze" : q.type === "open" ? "Open" : "Invul"}
              </span>
            </div>

            <p className="mb-4 text-[15px] font-medium leading-relaxed">{q.question}</p>

            <div className="space-y-3">
              {q.type === "multiple-choice" && q.shuffledOptions && (
                <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                  {q.shuffledOptions.map((option, i) => (
                    <label key={i}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all",
                        currentAnswer === option ? "text-white" : "bg-card hover:opacity-80"
                      )}
                      style={currentAnswer === option
                        ? { background: C, borderColor: C }
                        : { borderColor: `${C}20` }}>
                      <RadioGroupItem value={option} />
                      {option}
                    </label>
                  ))}
                </RadioGroup>
              )}

              {q.type === "fill-in" && (
                <Input value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)}
                  onKeyDown={handleKeyDown} placeholder="Typ je antwoord..." className="text-sm" autoFocus />
              )}

              {q.type === "open" && (
                <Textarea value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)}
                  placeholder="Schrijf je antwoord..." className="min-h-[100px] text-sm" autoFocus />
              )}

              {/* Action row */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                {/* ✅ FIX 4: back button */}
                {currentIdx > 0 && (
                  <button onClick={handleGoBack}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    ← Terug
                  </button>
                )}

                <Button onClick={submitAnswer} disabled={!currentAnswer.trim()}
                  className="text-white hover:opacity-90 transition-opacity"
                  style={{ background: C, border: "none" }}>
                  {currentIdx + 1 < testQuestions.length ? "Volgende →" : "Afronden ✓"}
                </Button>

                <button onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Overslaan
                </button>

                {/* ✅ FIX 2: stop with inline confirmation */}
                <div className="ml-auto flex items-center gap-2">
                  {!stopConfirm ? (
                    answers.length > 0 && (
                      <button onClick={() => setStopConfirm(true)}
                        className="text-xs font-medium transition-colors hover:opacity-70"
                        style={{ color: C }}>
                        ■ Stop toets
                      </button>
                    )
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">Stoppen?</span>
                      <button onClick={doStopTest}
                        className="text-xs font-bold rounded-lg px-2 py-1 text-white transition-opacity hover:opacity-80"
                        style={{ background: C }}>
                        Ja
                      </button>
                      <button onClick={() => setStopConfirm(false)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Nee
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── AI ASSESS ── */
  if (phase === "ai-assess") {
    const pct = assessTotal > 0 ? assessProgress / assessTotal : 0;
    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 p-10 text-center"
          style={{ borderColor: `${C}30`, background: `linear-gradient(135deg, ${C}06 0%, ${C}02 100%)` }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl animate-pulse"
            style={{ background: `${C}18` }}>
            🦬
          </div>
          <p className="text-base font-bold text-foreground mb-1">Buffy beoordeelt je antwoorden...</p>
          <p className="text-sm text-muted-foreground mb-6">
            {assessProgress < assessTotal
              ? `Open vraag ${assessProgress + 1} van ${assessTotal}`
              : "Bijna klaar..."}
          </p>
          <div className="relative h-3 w-full max-w-xs mx-auto overflow-hidden rounded-full"
            style={{ background: `${C}18` }}>
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{ width: `${pct * 100}%`, background: C }} />
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
        <div className="rounded-2xl border-2 p-6"
          style={{ borderColor: `${C}30`, background: `linear-gradient(135deg, ${C}06 0%, ${C}02 100%)` }}>

          {/* Big grade */}
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Jouw cijfer</p>
            {/* ✅ FIX 9: 10.0 → "10" */}
            <p className={cn("text-7xl font-black tabular-nums", cijferColor(cijfer))}>
              {formatCijfer(cijfer)}
            </p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {passed ? "✅ Voldoende!" : "❌ Onvoldoende"}
            </p>
            {stoppedEarly && (
              <p className="mt-2 text-xs text-muted-foreground">
                Toets gestopt na {answers.length} van {testQuestions.length} vragen
                · {formatTime(timeTaken)} gespendeerd
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Goed",       value: String(fullyCorrectCount), icon: "✅"  },
              { label: "Deels goed", value: String(partialCount),      icon: "〰️" },
              { label: stoppedEarly ? "Niet gemaakt" : "Overgeslagen",
                value: stoppedEarly
                  ? String(testQuestions.length - answers.length)
                  : String(skippedCount),
                icon: "⏭️" },
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
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Per niveau</p>
            {diffBreakdown.map(({ diff, total, pts }) => {
              const pct = total > 0 ? pts / total : 0;
              const { label, color } = DIFF_LABELS[diff];
              return (
                <div key={diff} className="flex items-center gap-3">
                  <span className={cn("text-xs font-semibold w-36 shrink-0", color)}>
                    {"★".repeat(diff)} {label}
                  </span>
                  <div className="relative flex-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct * 100}%`,
                        background: pct >= 0.7 ? "#22c55e" : pct >= 0.5 ? "#f59e0b" : C,
                      }} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground w-16 text-right shrink-0">
                    {pts}/{total}pt
                  </span>
                </div>
              );
            })}
          </div>

          {/* Review wrong/partial */}
          {reviewAnswers.length > 0 && (
            <div className="mb-5">
              <button onClick={() => setShowReview(!showReview)}
                className="flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all hover:opacity-80"
                style={{ borderColor: `${C}40`, background: `${C}08`, color: C }}>
                <span className={cn("text-xs transition-transform", showReview && "rotate-90")}>▶</span>
                Bekijk {reviewAnswers.length} vraag{reviewAnswers.length !== 1 ? "en" : ""} om van te leren
              </button>

              {showReview && (
                <div className="mt-3 space-y-3 animate-fade-in">
                  {reviewAnswers.map(({ q, a }) => (
                    <div key={q.id} className="rounded-xl border bg-card p-4 space-y-2"
                      style={{ borderColor: `${C}25` }}>

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-bold", DIFF_LABELS[q.difficulty]?.color)}>
                          {"★".repeat(q.difficulty)} {DIFF_LABELS[q.difficulty]?.label}
                        </span>
                        {a?.score === 0.5 && (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            Deels goed (0,5 pt)
                          </span>
                        )}
                        {a?.score === 0 && !a?.skipped && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ background: C }}>
                            Fout
                          </span>
                        )}
                        {a?.skipped && (
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            Overgeslagen
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium leading-relaxed">{q.question}</p>

                      {a?.studentAnswer && (
                        <div className="rounded-lg border p-2.5"
                          style={{ background: `${C}07`, borderColor: `${C}20` }}>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">Jouw antwoord</p>
                          <p className="text-sm text-foreground/70 whitespace-pre-wrap">{a.studentAnswer}</p>
                        </div>
                      )}

                      {a?.aiFeedback && (
                        <div className="rounded-lg border border-gres-blue/15 bg-gres-blue/5 p-2.5">
                          <p className="text-[10px] font-bold uppercase text-gres-blue mb-0.5">Buffy zegt</p>
                          <p className="text-sm text-foreground/70">{a.aiFeedback}</p>
                          {a.aiTip && <p className="mt-1 text-xs text-muted-foreground italic">💡 {a.aiTip}</p>}
                        </div>
                      )}

                      <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 p-2.5">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">Goed antwoord</p>
                        <p className="text-sm text-foreground/80 font-medium">{q.answer}</p>
                      </div>

                      {q.explanation && (
                        <div className="rounded-lg bg-gres-yellow/10 border border-gres-yellow/20 p-2.5">
                          <p className="text-[10px] font-bold uppercase text-gres-blue mb-0.5">Uitleg</p>
                          <p className="text-sm text-foreground/70 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => { setPhase("intro"); setShowReview(false); }}
              className="text-white hover:opacity-90 transition-opacity"
              style={{ background: C, border: "none" }}>
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
