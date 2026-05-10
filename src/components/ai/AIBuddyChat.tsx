"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
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
  const storageKey = `biobuffel-chat-${paragraphId}`;

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sla berichten op in localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 60);
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }

  async function handleSend(directText?: string) {
    const text = (directText || input).trim();
    if (!text || isLoading) return;
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          paragraphId,
        }),
        signal: abortRef.current.signal,
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
      let buffer = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
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
            // incomplete JSON, will be completed in next chunk
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

  function handleRefresh() {
    abortRef.current?.abort();
    setIsLoading(false);
    // Verwijder het laatste (incomplete) assistant-bericht
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && !last.content) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }

  function handleClearChat() {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages([]);
    localStorage.removeItem(storageKey);
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100%" }}>
      {/* Wis gesprek knop */}
      {messages.length > 0 && (
        <div className="flex justify-end px-3 pt-2">
          <button
            onClick={handleClearChat}
            className="text-[10px] font-medium text-muted-foreground hover:text-red-500 transition-colors"
          >
            🗑️ Wis gesprek
          </button>
        </div>
      )}
      {/* Messages */}
      <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gres-yellow/20 to-green-400/10 shadow-md animate-pulse">
              <span className="text-3xl">🦬</span>
            </div>
            <p className="text-sm font-bold text-foreground/80">
              Yo! Ik ben Buffy 🔥
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[220px]">
              Stel me een vraag, of klik op een bubbel hieronder. Ik help je met deze les! 💯
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gres-yellow/30 to-green-400/20 text-sm mt-0.5">
                🦬
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-gres-blue text-white rounded-br-md"
                  : "bg-muted rounded-bl-md"
              )}
            >
              {msg.content ? (
                msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      h1: ({ children }) => <p className="mb-1 font-bold text-base">{children}</p>,
                      h2: ({ children }) => <p className="mb-1 font-bold text-base">{children}</p>,
                      h3: ({ children }) => <p className="mb-1 font-bold">{children}</p>,
                      code: ({ children }) => <code className="rounded bg-black/10 px-1 py-0.5 text-xs">{children}</code>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )
              ) : (
                <span className="inline-flex gap-1 text-muted-foreground">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce [animation-delay:0.1s]">·</span>
                  <span className="animate-bounce [animation-delay:0.2s]">·</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Scroll-naar-beneden knop */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gres-blue/80 px-3 py-1 text-xs text-white shadow-md transition hover:bg-gres-blue"
        >
          ↓ Nieuwste
        </button>
      )}
      </div>

      {/* Prompt bubbels */}
      <div className="border-t border-gres-blue/10 px-2 pt-1.5 pb-1">
        <div className="flex flex-wrap gap-1">
          {[
            { emoji: "📋", label: "Samenvatting", color: "text-gres-blue", prompt: "Geef me een korte samenvatting van deze paragraaf in bullet points", tooltip: "Geeft je een overzichtelijke samenvatting van de les" },
            { emoji: "🧠", label: "Begrippen", color: "text-green-600", prompt: "Oefen met mij de kernbegrippen van deze paragraaf! Noem steeds één begrip en laat mij de definitie geven.", tooltip: "Oefent de begrippen met je zodat je ze onthoudt" },
            { emoji: "🎲", label: "Quiz", color: "text-purple-600", prompt: "Start een quiz over deze paragraaf! Stel me meerdere vragen één voor één en houd mijn score bij.", tooltip: "Start een quiz met score" },
            { emoji: "💡", label: "Metafoor", color: "text-yellow-600", prompt: "Leg de lesstof uit met een metafoor die makkelijk te begrijpen is", tooltip: "Vergelijking die je makkelijk onthoudt" },
            { emoji: "😊", label: "Simpel", color: "text-orange-500", prompt: "Leg de lesstof zo simpel mogelijk uit alsof ik 8 jaar oud ben", tooltip: "Zo simpel mogelijk uitgelegd" },
            { emoji: "⚽", label: "Sport", color: "text-teal-600", prompt: "Leg de lesstof uit met een voorbeeld uit de sportwereld", tooltip: "Sportvoorbeeld om het te snappen" },
            { emoji: "❓", label: "Waarom?", color: "text-red-500", prompt: "Waarom is deze lesstof belangrijk? Waar heb ik dit voor nodig?", tooltip: "Waarom moet je dit leren?" },
            { emoji: "🎓", label: "Toets", color: "text-amber-700", prompt: "Geef me een tip voor de toets over deze lesstof. Waar moet ik extra op letten?", tooltip: "Handige tip voor de toets" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleSend(item.prompt)}
              disabled={isLoading}
              className="group relative inline-flex items-center gap-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium transition hover:shadow-md hover:border-gray-300 disabled:opacity-50"
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
          {isLoading ? (
            <Button
              onClick={handleRefresh}
              size="sm"
              className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-3"
            >
              ↻
            </Button>
          ) : (
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              size="sm"
              className="shrink-0 bg-gres-blue hover:bg-gres-blue-light text-white rounded-xl px-3"
            >
              ➤
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
