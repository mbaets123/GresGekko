"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Reproductie",
  2: "Toepassen",
  3: "Nieuwe situaties",
  4: "Inzicht",
};

interface QuestionCardProps {
  question: Question;
  index: number;
  onAnswered?: (questionId: string) => void;
}

export function QuestionCard({ question, index, onAnswered }: QuestionCardProps) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  function normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/^(de|het|een)\s+/i, "")
      .replace(/\s+/g, " ")
      .replace(/[.,!?;:'"()-]/g, "");
  }

  function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
  }

  function isCloseEnough(student: string, correct: string): boolean {
    const s = normalize(student);
    const c = normalize(correct);
    if (s === c) return true;
    const maxDist = c.length <= 6 ? 1 : 2;
    return levenshtein(s, c) <= maxDist;
  }

  function handleSubmit() {
    if (!answer.trim()) return;
    if (question.type === "open") {
      setIsCorrect(false);
      setSubmitted(true);
      onAnswered?.(question.id);
      return;
    }
    const correct = question.type === "fill-in"
      ? isCloseEnough(answer, question.answer)
      : normalize(answer) === normalize(question.answer);
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswered?.(question.id);
  }

  function handleRetry() {
    setAnswer("");
    setSubmitted(false);
    setIsCorrect(false);
  }

  const stars = "★".repeat(question.difficulty) + "☆".repeat(4 - question.difficulty);
  const diffLabel = DIFFICULTY_LABELS[question.difficulty] || "";

  // Tooltip state for stars
  const [starTip, setStarTip] = useState(false);
  const [starTipVisible, setStarTipVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const starOpenRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const starCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onTouch() {
      setIsTouchDevice(true);
      window.removeEventListener("touchstart", onTouch);
    }
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouch);
      if (starOpenRef.current) clearTimeout(starOpenRef.current);
      if (starCloseRef.current) clearTimeout(starCloseRef.current);
    };
  }, []);

  const handleStarEnter = useCallback(() => {
    if (isTouchDevice) return;
    if (starCloseRef.current) clearTimeout(starCloseRef.current);
    starOpenRef.current = setTimeout(() => {
      setStarTip(true);
      requestAnimationFrame(() => setStarTipVisible(true));
    }, 120);
  }, [isTouchDevice]);

  const handleStarLeave = useCallback(() => {
    if (isTouchDevice) return;
    if (starOpenRef.current) clearTimeout(starOpenRef.current);
    setStarTipVisible(false);
    starCloseRef.current = setTimeout(() => setStarTip(false), 100);
  }, [isTouchDevice]);

  const handleStarClick = useCallback(() => {
    if (isTouchDevice) {
      setStarTip((prev) => {
        const next = !prev;
        setStarTipVisible(next);
        return next;
      });
    }
  }, [isTouchDevice]);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 transition-all",
        submitted && isCorrect && "border-green-300 bg-green-50/50",
        submitted && !isCorrect && "border-orange-300 bg-orange-50/50"
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Vraag {index + 1}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="relative inline-flex cursor-pointer text-sm text-gres-yellow"
            onMouseEnter={handleStarEnter}
            onMouseLeave={handleStarLeave}
            onClick={handleStarClick}
          >
            {stars}
            {starTip && (
              <>
                {isTouchDevice && (
                  <div className="fixed inset-0 z-40" onClick={() => { setStarTipVisible(false); setStarTip(false); }} />
                )}
                <span
                  className={cn(
                    "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-gres-blue px-3 py-2 text-xs font-normal text-white shadow-lg text-center transition-all duration-150",
                    starTipVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  )}
                >
                  {diffLabel}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gres-blue" />
                </span>
              </>
            )}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {question.type === "multiple-choice" && "Meerkeuze"}
            {question.type === "open" && "Open"}
            {question.type === "fill-in" && "Invul"}
          </span>
        </div>
      </div>

      {/* Question */}
      <p className="mb-4 text-[15px] font-medium leading-relaxed">
        {question.question}
      </p>

      {/* Answer input */}
      {!submitted && (
        <div className="space-y-3">
          {question.type === "multiple-choice" && question.options && (
            <RadioGroup value={answer} onValueChange={setAnswer}>
              {question.options.map((option, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all hover:bg-gres-blue/5",
                    answer === option && "border-gres-blue bg-gres-blue/5"
                  )}
                >
                  <RadioGroupItem value={option} />
                  {option}
                </label>
              ))}
            </RadioGroup>
          )}

          {question.type === "fill-in" && (
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Typ je antwoord..."
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          )}

          {question.type === "open" && (
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Schrijf je antwoord..."
              className="min-h-[80px] text-sm"
            />
          )}

          <Button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="bg-gres-blue hover:bg-gres-blue-light text-white"
          >
            Controleer
          </Button>
        </div>
      )}

      {/* Feedback */}
      {submitted && (
        <div className="space-y-3">
          {question.type === "open" ? (
            <div className="rounded-xl bg-gres-blue/5 border border-gres-blue/15 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📝</span>
                <p className="text-sm font-bold text-gres-blue">
                  Vergelijk jouw antwoord met het voorbeeldantwoord
                </p>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-white dark:bg-gray-800 border border-gres-blue/10 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Jouw antwoord
                  </p>
                  <p className="text-sm text-foreground/80">{answer}</p>
                </div>
                <div className="rounded-lg bg-gres-yellow/10 border border-gres-yellow/20 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gres-blue">
                    Voorbeeldantwoord
                  </p>
                  <p className="text-sm text-foreground/80">{question.answer}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                💡 Tip: controleer of jouw antwoord de belangrijkste punten bevat.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-xl p-4",
                isCorrect
                  ? "bg-green-100/80 border border-green-200"
                  : "bg-orange-100/80 border border-orange-200"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{isCorrect ? "✅" : "❌"}</span>
                <p className="text-sm font-bold">
                  {isCorrect ? "Goed zo!" : "Helaas, dat is niet juist."}
                </p>
              </div>
              {!isCorrect && (
                <p className="text-sm text-foreground/70">
                  Het goede antwoord is:{" "}
                  <span className="font-semibold">{question.answer}</span>
                </p>
              )}
            </div>
          )}

          {/* Explanation */}
          <div className="rounded-xl bg-gres-yellow/10 border border-gres-yellow/20 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gres-blue">
              Uitleg
            </p>
            <p className="text-sm leading-relaxed text-foreground/80">
              {question.explanation}
            </p>
          </div>

          <Button
            onClick={handleRetry}
            className="bg-gres-blue hover:bg-gres-blue-light text-white"
          >
            Opnieuw proberen
          </Button>
        </div>
      )}
    </div>
  );
}
