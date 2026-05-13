"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIBuddyChatProps {
  paragraphId: string;
}

export function AIBuddyChat({ paragraphId }: AIBuddyChatProps) {
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
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [pendingFresh, setPendingFresh] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sla berichten op in localStorage (met try/catch voor quota errors)
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        // localStorage vol — verwijder oudste gesprekken
        try {
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith("biobuffel-chat-")) {
              localStorage.removeItem(key);
            }
          }
          localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
        } catch {
          // Storage volledig onbeschikbaar, geen actie
        }
      }
    }
  }, [messages, storageKey]);

  useEffect(() => {
    // Alleen naar beneden scrollen als de gebruiker al onderaan was (of nieuw bericht begint)
    if (scrollRef.current && !showScrollBtn) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showScrollBtn]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 60);
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }

  function handleBubbleClick(prompt: string, freshStart = false) {
    if (isLoading) return;
    if (freshStart && messages.length > 0) {
      setPendingFresh(prompt);
      return;
    }
    handleSend(prompt, freshStart);
  }

  function confirmFresh() {
    if (!pendingFresh) return;
    const prompt = pendingFresh;
    setPendingFresh(null);
    handleSend(prompt, true);
  }

  async function handleSend(directText?: string, freshStart?: boolean) {
    const text = (directText || input).trim();
    if (!text || isLoading) return;

    // Abort any in-progress request
    if (abortRef.current) abortRef.current.abort();

    const userMessage: Message = { role: "user", content: text };
    const newMessages = freshStart
      ? [userMessage]
      : [...messages, userMessage];
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
      if (!reader) {
        setMessages([...newMessages, { role: "assistant", content: "Er ging iets mis met de verbinding. Probeer het opnieuw." }]);
        setIsLoading(false);
        return;
      }

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
    // Verwijder altijd het laatste assistant-bericht (ook als het al gedeeltelijk gevuld is)
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
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


      {/* Fresh-start waarschuwing */}
      {pendingFresh && (
        <div className="border-t border-gres-blue/10 px-3 py-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30">
          <span className="text-xs text-amber-700 dark:text-amber-400 flex-1">
            ⚠️ Dit wist het huidige gesprek. Doorgaan?
          </span>
          <button
            onClick={confirmFresh}
            className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-2.5 py-1 transition-colors"
          >
            Ja, wis
          </button>
          <button
            onClick={() => setPendingFresh(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Annuleer
          </button>
        </div>
      )}

      {/* Prompt bubbels */}
      <div className="border-t border-gres-blue/10 px-2 pt-1.5 pb-1 overflow-visible">
        <div className="flex flex-wrap gap-1 overflow-visible">
          {[
            { emoji: "📋", label: "Samenvatting",  color: "text-gres-blue dark:text-gres-blue",          fresh: false, prompt: "Geef me een korte samenvatting van deze paragraaf in bullet points", tooltip: "Geeft je een overzichtelijke samenvatting van de les" },
            { emoji: "🧠", label: "Begrippen",     color: "text-green-600 dark:text-green-400",          fresh: true,  prompt: "Oefen met mij de kernbegrippen van deze paragraaf! Noem steeds één begrip en laat mij de definitie geven.", tooltip: "Oefent de begrippen met je zodat je ze onthoudt" },
            { emoji: "🎲", label: "Quiz",           color: "text-purple-600 dark:text-purple-400",       fresh: true,  prompt: "Start een quiz van precies 3 willekeurige vragen over deze paragraaf. Stel ze één voor één en houd de score bij.", tooltip: "3 willekeurige quizvragen met score" },
            { emoji: "🌍", label: "Jouw wereld",   color: "text-teal-600 dark:text-teal-400",            fresh: true,  prompt: "Ik wil de lesstof uitgelegd krijgen met een voorbeeld uit mijn eigen wereld. Vraag me eerst kort: welk onderwerp vind ik leuk? (bijv. sport, games, muziek, koken, dieren...) en gebruik dat dan als voorbeeld.", tooltip: "Buffy vraagt wat jij leuk vindt en gebruikt dat als voorbeeld" },
            { emoji: "❓", label: "Waarom?",       color: "text-red-500 dark:text-red-400",              fresh: false, prompt: "Waarom is deze lesstof belangrijk? Waar heb ik dit voor nodig?", tooltip: "Waarom moet je dit leren?" },
            { emoji: "🎤", label: "Rap",            color: "text-pink-600 dark:text-pink-400",           fresh: false, prompt: "Rap over de lesstof van deze paragraaf! Gebruik de kernbegrippen en leerdoelen.", tooltip: "Buffy rapt de lesstof voor je" },
            { emoji: "🔥", label: "Roast mij",     color: "text-red-500 dark:text-red-400",              fresh: true,  prompt: "Roast mijn kennis over deze paragraaf! Stel me eerst één vraag over de lesstof, wacht op mijn antwoord, en roast me dan op basis van wat ik zeg — maar corrigeer me daarna wel met het goede antwoord.", tooltip: "Buffy roast jouw kennis (maar leert je wel wat)" },
            { emoji: "🤔", label: "Wat als...?",   color: "text-cyan-600 dark:text-cyan-400",            fresh: true,  prompt: "Stel me een korte 'wat als' vraag over de lesstof van deze paragraaf. Biologisch relevant, licht grappig maar niet te absurd. Max 2 zinnen.", tooltip: "Een hypothetische vraag over de lesstof" },
            { emoji: "👴", label: "Opa-uitleg",    color: "text-stone-500 dark:text-stone-400",          fresh: false, prompt: "Leg de lesstof van deze paragraaf uit alsof je het aan mijn opa uitlegt die echt niks van biologie weet. Simpel, grappig en met alledaagse voorbeelden.", tooltip: "Uitleg alsof je het aan opa vertelt" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleBubbleClick(item.prompt, item.fresh)}
              disabled={isLoading}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltip({ text: item.tooltip, x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => setTooltip(null)}
              className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium transition hover:shadow-md hover:border-gray-300 disabled:opacity-50"
            >
              <span>{item.emoji}</span>
              <span className={item.color}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gres-blue/10 p-3">
        {input.length > 400 && (
          <p className={cn(
            "mb-1 text-right text-[10px] font-medium",
            input.length >= 500 ? "text-red-500" : "text-amber-500"
          )}>
            {input.length}/500{input.length >= 500 && " — te lang!"}
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
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

      {/* Fixed tooltip — niet beperkt door overflow-hidden */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full rounded-xl bg-gres-blue px-3 py-2 text-[11px] font-normal text-white shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
