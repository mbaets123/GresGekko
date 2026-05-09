"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

interface QuestionCardProps {
  question: Question;
  index: number;
}

export function QuestionCard({ question, index }: QuestionCardProps) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  function handleSubmit() {
    if (!answer.trim()) return;
    if (question.type === "open") {
      // Open vragen worden niet automatisch beoordeeld
      setIsCorrect(false);
      setSubmitted(true);
      return;
    }
    const correct =
      answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    setIsCorrect(correct);
    setSubmitted(true);
  }

  function handleRetry() {
    setAnswer("");
    setSubmitted(false);
    setIsCorrect(false);
  }

  const stars = "★".repeat(question.difficulty) + "☆".repeat(4 - question.difficulty);

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
          <span className="text-sm text-gres-yellow">{stars}</span>
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
            variant="outline"
            className="border-gres-blue/20 text-gres-blue hover:bg-gres-blue/5"
          >
            Opnieuw proberen
          </Button>
        </div>
      )}
    </div>
  );
}
