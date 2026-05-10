"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ConceptChipProps {
  term: string;
  definition?: string;
}

export function ConceptChip({ term, definition }: ConceptChipProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect touch device on first touch
  useEffect(() => {
    function onTouch() {
      setIsTouchDevice(true);
      window.removeEventListener("touchstart", onTouch);
    }
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  // Desktop: hover with delayed open, instant close
  const handleMouseEnter = useCallback(() => {
    if (isTouchDevice || !definition) return;
    // Cancel any pending close
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    // Small delay before showing — smoother when moving between chips
    openTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      // Tiny extra delay for fade-in to feel natural
      requestAnimationFrame(() => setVisible(true));
    }, 120);
  }, [isTouchDevice, definition]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice) return;
    // Cancel pending open if user moved away quickly
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    // Close instantly
    setVisible(false);
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 100);
  }, [isTouchDevice]);

  // Mobile: tap to toggle
  const handleClick = useCallback(() => {
    if (!definition) return;
    if (isTouchDevice) {
      setOpen((prev) => {
        const next = !prev;
        setVisible(next);
        return next;
      });
    }
    // On desktop, click does nothing — hover handles it
  }, [isTouchDevice, definition]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center rounded-full bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-gres-blue shadow-sm transition-colors",
          definition && "cursor-pointer hover:bg-gres-blue/10 active:bg-gres-blue/20",
          open && "bg-gres-blue/10 ring-2 ring-gres-blue/30"
        )}
      >
        {term}
      </button>
      {definition && open && (
        <>
          {/* Backdrop only on mobile (touch) to close on tap outside */}
          {isTouchDevice && (
            <div className="fixed inset-0 z-40" onClick={() => { setVisible(false); setOpen(false); }} />
          )}
          <span
            className={cn(
              "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-normal rounded-xl bg-gres-blue px-3 py-2 text-xs font-normal text-white shadow-lg w-max max-w-[220px] text-center transition-all duration-150",
              visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
          >
            {definition}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gres-blue" />
          </span>
        </>
      )}
    </span>
  );
}
