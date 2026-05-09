"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIBuddyChatProps {
  paragraphId: string;
  paragraphTitle: string;
}

export function AIBuddyChat({ paragraphId, paragraphTitle }: AIBuddyChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(directText?: string) {
    const text = (directText || input).trim();
    if (!text || isLoading) return;
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          paragraphId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages([
          ...newMessages,
          { role: "assistant", content: err.error || "Er ging iets mis." },
        ]);
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            assistantContent += delta;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
              };
              return updated;
            });
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Er ging iets mis met de verbinding. Probeer het opnieuw.",
        },
      ]);
    }

    setIsLoading(false);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100%" }}>
      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gres-yellow/20 to-gres-blue/10">
              <span className="text-xl">🦎</span>
            </div>
            <p className="text-sm font-medium text-foreground/80">
              Hoi! Ik ben de GresGekko
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
              Hulp nodig met deze paragraaf..?
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              msg.role === "user"
                ? "ml-auto bg-gres-blue text-white rounded-br-md"
                : "mr-auto bg-muted rounded-bl-md"
            )}
          >
            {msg.content || (
              <span className="inline-flex gap-1 text-muted-foreground">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce [animation-delay:0.1s]">·</span>
                <span className="animate-bounce [animation-delay:0.2s]">·</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Prompt bubbels */}
      <div className="border-t border-gres-blue/10 px-3 pt-2 pb-1">
        <div className="flex flex-wrap gap-1.5">
          {[
            { emoji: "💡", label: "Metafoor", color: "text-yellow-600", prompt: "Leg de lesstof uit met een metafoor die makkelijk te begrijpen is", tooltip: "Legt de stof uit met een vergelijking die je makkelijk onthoudt" },
            { emoji: "📋", label: "Stappenplan", color: "text-gres-blue", prompt: "Geef me een stappenplan om deze lesstof te leren", tooltip: "Geeft je een duidelijk plan om de stof stap voor stap te leren" },
            { emoji: "❓", label: "Waarom?", color: "text-red-500", prompt: "Waarom is deze lesstof belangrijk? Waar heb ik dit voor nodig?", tooltip: "Vertelt waarom je dit moet leren en waar je het tegenkomt" },
            { emoji: "🧩", label: "Puzzelstukje", color: "text-green-600", prompt: "Hoe hangt deze lesstof samen met wat ik al weet?", tooltip: "Laat zien hoe deze les past bij wat je al hebt geleerd" },
            { emoji: "⚽", label: "Voetbal", color: "text-teal-600", prompt: "Leg de lesstof uit met een voorbeeld uit de sportwereld", tooltip: "Gebruikt een sportvoorbeeld om de stof uit te leggen" },
            { emoji: "😊", label: "Simpel", color: "text-orange-500", prompt: "Leg de lesstof zo simpel mogelijk uit alsof ik 8 jaar oud ben", tooltip: "Legt alles zo simpel mogelijk uit in makkelijke taal" },
            { emoji: "🎲", label: "Quiz me", color: "text-purple-600", prompt: "Stel me een quizvraag over deze lesstof", tooltip: "Stelt je een quizvraag om te testen of je het snapt" },
            { emoji: "🎓", label: "Examentip", color: "text-amber-700", prompt: "Geef me een tip voor het toets over deze lesstof", tooltip: "Geeft je een handige tip voor de toets" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleSend(item.prompt)}
              disabled={isLoading}
              className="group relative inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium transition hover:shadow-md hover:border-gray-300 disabled:opacity-50"
            >
              <span>{item.emoji}</span>
              <span className={item.color}>{item.label}</span>
              <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 whitespace-normal rounded-xl bg-gres-blue px-3 py-2 text-[11px] font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 w-max max-w-[180px] text-left">
                {item.tooltip}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gres-blue/10 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Stel een vraag over deze les"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gres-blue/15 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gres-blue/30"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="shrink-0 bg-gres-blue hover:bg-gres-blue-light text-white rounded-xl px-3"
          >
            ➤
          </Button>
        </div>
      </div>
    </div>
  );
}
