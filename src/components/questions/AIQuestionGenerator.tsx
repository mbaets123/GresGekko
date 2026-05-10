"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AIQuestion {
  type: "multiple-choice" | "fill-in" | "open";
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  feedbackCorrect?: string;
  feedbackWrong?: string;
}

interface AIEvaluation {
  score: "goed" | "deels" | "fout";
  feedback: string;
  tip: string;
}

type Phase = "idle" | "picking" | "loading" | "answering" | "feedback";
type QuestionType = "multiple-choice" | "open" | "fill-in" | "random";

const GEKKO_INTROS = [
  "Yo, jij hebt er zin in! 🦎🔥",
  "Lekker bezig bro! 💯",
  "Sheesh, dooroefenen? Respect! 🔥",
  "Ayo, die motivatie is fire! 🦎",
  "No cap, jij bent een W-leerling! 💪",
  "Fr fr, lekker doorknallen! 🧠",
  "Die grindset bro, love it! 🦎✅",
  "Jij stopt niet hè? Goated! 🔥",
];

const LEVEL_INFO = [
  { level: 1, label: "Reproductie", emoji: "★" },
  { level: 2, label: "Toepassen", emoji: "★★" },
  { level: 3, label: "Nieuwe situaties", emoji: "★★★" },
  { level: 4, label: "Inzicht", emoji: "★★★★" },
];

const TYPE_OPTIONS: { type: QuestionType; label: string; emoji: string }[] = [
  { type: "multiple-choice", label: "Meerkeuze", emoji: "🔘" },
  { type: "open", label: "Open", emoji: "✍️" },
  { type: "fill-in", label: "Invul", emoji: "📝" },
  { type: "random", label: "Willekeurig", emoji: "🎲" },
];

function randomIntro(): string {
  return GEKKO_INTROS[Math.floor(Math.random() * GEKKO_INTROS.length)];
}

interface AIQuestionGeneratorProps {
  paragraphId: string;
}

export function AIQuestionGenerator({ paragraphId }: AIQuestionGeneratorProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [intro, setIntro] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [question, setQuestion] = useState<AIQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<AIEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const [selectedType, setSelectedType] = useState<QuestionType>("multiple-choice");

  const startPicking = useCallback(() => {
    setIntro(randomIntro());
    setPhase("picking");
    setError("");
  }, []);

  async function generateQuestion(questionType: QuestionType) {
    setPhase("loading");
    setAnswer("");
    setQuestion(null);
    setError("");

    const resolvedType = questionType === "random"
      ? (["multiple-choice", "open", "fill-in"] as const)[Math.floor(Math.random() * 3)]
      : questionType;

    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphId, difficulty: selectedLevel, questionType: resolvedType, previousQuestions }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Er ging iets mis.");
        setPhase("picking");
        return;
      }

      const data = await res.json();
      setQuestion(data.question);
      setPreviousQuestions((prev) => [...prev, data.question.question]);
      setPhase("answering");
    } catch {
      setError("Verbindingsfout. Probeer het opnieuw.");
      setPhase("picking");
    }
  }

  function normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/^(de|het|een)\s+/i, "")
      .replace(/\s+/g, " ")
      .replace(/[.,!?;:'"()-]/g, "");
  }

  /** Levenshtein distance — allows small typos in fill-in answers */
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
    // Allow 1 typo for words <= 6 chars, 2 typos for longer words
    const maxDist = c.length <= 6 ? 1 : 2;
    return levenshtein(s, c) <= maxDist;
  }

  async function handleSubmit() {
    if (!answer.trim() || !question) return;
    if (question.type === "open") {
      setCount((c) => c + 1);
      setPhase("feedback");
      setEvaluating(true);
      setEvaluation(null);
      try {
        const res = await fetch("/api/evaluate-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: question.question,
            correctAnswer: question.answer,
            studentAnswer: answer,
            paragraphId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setEvaluation(data.evaluation);
          setIsCorrect(data.evaluation.score === "goed");
        }
      } catch { /* evaluation failed silently, show compare view */ }
      setEvaluating(false);
      return;
    }
    const correct = question.type === "fill-in"
      ? isCloseEnough(answer, question.answer)
      : normalize(answer) === normalize(question.answer);
    setIsCorrect(correct);
    setCount((c) => c + 1);
    setPhase("feedback");
  }

  function handleReset() {
    setEvaluation(null);
    setEvaluating(false);
    setShowExample(false);
    setPhase("idle");
    setQuestion(null);
    setAnswer("");
    setError("");
  }

  // Phase: idle — show the generate button
  if (phase === "idle") {
    return (
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={startPicking}
          className="group flex items-center gap-2 rounded-full border-2 border-dashed border-gres-yellow/40 bg-gres-yellow/10 px-5 py-3 text-sm font-semibold text-gres-blue transition-all hover:border-gres-yellow hover:bg-gres-yellow/20 hover:shadow-md"
        >
          <span className="text-lg transition-transform group-hover:scale-110">🦎</span>
          Genereer een nieuwe vraag
        </button>
        {count > 0 && (
          <span className="text-xs text-muted-foreground">
            🦎 {count} extra {count === 1 ? "vraag" : "vragen"} geoefend!
          </span>
        )}
      </div>
    );
  }

  // Phase: picking — choose difficulty + type in one screen
  if (phase === "picking") {
    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 border-gres-yellow/30 bg-gradient-to-br from-gres-yellow/10 to-gres-blue/5 p-5">
          {/* GresGekko speech bubble */}
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gres-blue text-lg shadow-md">
              🦎
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 border border-gres-blue/10 px-4 py-2.5 shadow-sm">
              <p className="text-sm font-medium text-foreground">
                {intro}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Kies je niveau en vraagtype, en go!
              </p>
            </div>
          </div>

          {error && (
            <p className="mb-3 text-center text-xs text-red-500">{error}</p>
          )}

          {/* Difficulty level */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Moeilijkheidsgraad
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LEVEL_INFO.map(({ level, label, emoji }) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={cn(
                    "group rounded-xl border p-3 text-center transition-all active:scale-95",
                    selectedLevel === level
                      ? "border-gres-blue bg-gres-blue/10 shadow-md ring-2 ring-gres-blue/20"
                      : "bg-card hover:border-gres-blue/30 hover:shadow-sm"
                  )}
                >
                  <span className="block text-base text-gres-yellow">{emoji}</span>
                  <span className="mt-1 block text-xs font-semibold text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question type */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Type vraag
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPE_OPTIONS.map(({ type, label, emoji }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "group rounded-xl border p-3 text-center transition-all active:scale-95",
                    selectedType === type
                      ? "border-gres-blue bg-gres-blue/10 shadow-md ring-2 ring-gres-blue/20"
                      : "bg-card hover:border-gres-blue/30 hover:shadow-sm"
                  )}
                >
                  <span className="block text-lg">{emoji}</span>
                  <span className="mt-1 block text-xs font-semibold text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={() => generateQuestion(selectedType)}
            className="w-full bg-gres-blue hover:bg-gres-blue-light text-white"
          >
            🦎 Genereer vraag
          </Button>

          <button
            onClick={handleReset}
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Annuleren
          </button>
        </div>
      </div>
    );
  }

  // Phase: loading
  if (phase === "loading") {
    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 border-gres-yellow/30 bg-gradient-to-br from-gres-yellow/10 to-gres-blue/5 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gres-blue text-lg shadow-md animate-bounce">
              🦎
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                GresGekko denkt na over een goede vraag...
              </p>
              <div className="mt-1 flex gap-1">
                <span className="h-2 w-2 rounded-full bg-gres-yellow animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-gres-yellow animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-gres-yellow animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phase: answering — show the generated question
  if (phase === "answering" && question) {
    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 border-gres-yellow/30 bg-gradient-to-br from-gres-yellow/10 to-gres-blue/5 p-5">
          {/* GresGekko intro */}
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gres-blue text-lg shadow-md">
              🦎
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 border border-gres-blue/10 px-4 py-2.5 shadow-sm">
              <p className="text-sm font-medium text-foreground">
                Fire! Hier je vraag: 🔥
              </p>
            </div>
          </div>

          {/* Question card */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                AI Vraag
              </span>
              <span className="rounded-full bg-gres-yellow/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-gres-blue">
                {question.type === "multiple-choice" && "Meerkeuze"}
                {question.type === "fill-in" && "Invul"}
                {question.type === "open" && "Open"}
              </span>
            </div>

            <p className="mb-4 text-[15px] font-medium leading-relaxed">
              {question.question}
            </p>

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

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!answer.trim()}
                  className="bg-gres-blue hover:bg-gres-blue-light text-white"
                >
                  Controleer
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="text-muted-foreground"
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phase: feedback — show result with personalized feedback
  if (phase === "feedback" && question) {
    return (
      <div className="mt-6 animate-fade-in">
        <div className="rounded-2xl border-2 border-gres-yellow/30 bg-gradient-to-br from-gres-yellow/10 to-gres-blue/5 p-5">
          {/* GresGekko feedback */}
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gres-blue text-lg shadow-md">
              🦎
            </span>
            <div className={cn(
              "rounded-2xl rounded-tl-sm border px-4 py-2.5 shadow-sm",
              question.type === "open"
                ? evaluation
                  ? evaluation.score === "goed"
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200"
                    : evaluation.score === "deels"
                      ? "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200"
                      : "bg-orange-50 dark:bg-orange-950/30 border-orange-200"
                  : "bg-gres-blue/5 border-gres-blue/15"
                : isCorrect
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200"
                  : "bg-orange-50 dark:bg-orange-950/30 border-orange-200"
            )}>
              <p className="text-sm font-medium text-foreground">
                {question.type === "open"
                  ? evaluating
                    ? "Even kijken naar je antwoord... 🧠"
                    : evaluation
                      ? evaluation.feedback
                      : "Goed bezig! Vergelijk je antwoord met het voorbeeld 📝"
                  : isCorrect
                    ? (question.feedbackCorrect || "Goed zo bro! 🔥✅")
                    : (question.feedbackWrong || "Bijna! Maar geen stress 💪")}
              </p>
            </div>
          </div>

          {/* Result */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <p className="text-[15px] font-medium leading-relaxed text-muted-foreground">
              {question.question}
            </p>

            {/* Open question: AI evaluation */}
            {question.type === "open" ? (
              <div className="space-y-3">
                {/* Compact score + tip in one line */}
                {evaluating ? (
                  <div className="flex items-center gap-3 rounded-xl bg-gres-blue/5 border border-gres-blue/15 px-4 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gres-blue text-xs animate-bounce">🦎</span>
                    <p className="text-sm text-muted-foreground">GresGekko beoordeelt je antwoord...</p>
                  </div>
                ) : evaluation ? (
                  <div className={cn(
                    "rounded-xl px-4 py-3 border",
                    evaluation.score === "goed" && "bg-green-100/80 border-green-200",
                    evaluation.score === "deels" && "bg-yellow-100/80 border-yellow-200",
                    evaluation.score === "fout" && "bg-orange-100/80 border-orange-200",
                  )}>
                    <p className="text-sm">
                      <span className="font-bold">
                        {evaluation.score === "goed" ? "✅ Helemaal goed!" : evaluation.score === "deels" ? "🟡 Gedeeltelijk goed" : "❌ Nog niet helemaal"}
                      </span>
                      {evaluation.tip && (
                        <span className="text-foreground/60"> — 💡 {evaluation.tip}</span>
                      )}
                    </p>
                  </div>
                ) : null}

                {/* Jouw antwoord */}
                <div className="rounded-lg bg-white dark:bg-gray-800 border border-gres-blue/10 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Jouw antwoord
                  </p>
                  <p className="text-sm text-foreground/80">{answer}</p>
                </div>

                {/* Voorbeeldantwoord + uitleg — inklapbaar */}
                <button
                  onClick={() => setShowExample(!showExample)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gres-yellow/30 bg-gres-yellow/5 px-3 py-2.5 text-left text-sm font-medium text-gres-blue transition-colors hover:bg-gres-yellow/10"
                >
                  <span className={cn("transition-transform text-xs", showExample && "rotate-90")}>▶</span>
                  Bekijk voorbeeldantwoord & uitleg
                </button>
                {showExample && (
                  <div className="rounded-xl bg-gres-yellow/10 border border-gres-yellow/20 p-4 space-y-2 animate-fade-in">
                    <p className="text-sm text-foreground/80">
                      <span className="font-semibold text-gres-blue">Voorbeeldantwoord: </span>
                      {question.answer}
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/70">
                      <span className="font-semibold text-gres-blue">Uitleg: </span>
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* MC / fill-in: compact score */
              <div className="space-y-3">
                <div
                  className={cn(
                    "rounded-xl px-4 py-3 border",
                    isCorrect
                      ? "bg-green-100/80 border-green-200"
                      : "bg-orange-100/80 border-orange-200"
                  )}
                >
                  <p className="text-sm">
                    <span className="font-bold">{isCorrect ? "✅ Goed zo!" : "❌ Helaas, niet juist."}</span>
                    {!isCorrect && (
                      <span className="text-foreground/60"> — Het goede antwoord is: <span className="font-semibold text-foreground/80">{question.answer}</span></span>
                    )}
                  </p>
                </div>

                {/* Uitleg — altijd zichtbaar bij MC/fill-in */}
                <div className="rounded-xl bg-gres-yellow/10 border border-gres-yellow/20 p-4">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    <span className="font-semibold text-gres-blue">Uitleg: </span>
                    {question.explanation}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                onClick={startPicking}
                className="bg-gres-blue hover:bg-gres-blue-light text-white"
              >
                🦎 Nog een vraag!
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="text-muted-foreground"
              >
                Klaar met oefenen
              </Button>
            </div>
          </div>

          {/* Counter */}
          {count > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              🦎 {count} extra {count === 1 ? "vraag" : "vragen"} geoefend!
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
