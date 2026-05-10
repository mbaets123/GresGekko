"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ConceptChipProps {
  term: string;
  definition?: string;
}

export function ConceptChip({ term, definition }: ConceptChipProps) {
  const [open, setOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect touch device on first touch
  useEffect(() => {
    function onTouch() {
      setIsTouchDevice(true);
      window.removeEventListener("touchstart", onTouch);
    }
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  // Desktop: hover open/close with small delay
  const handleMouseEnter = useCallback(() => {
    if (isTouchDevice || !definition) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, [isTouchDevice, definition]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice) return;
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, [isTouchDevice]);

  // Mobile: tap to toggle
  const handleClick = useCallback(() => {
    if (!definition) return;
    if (isTouchDevice) {
      setOpen((prev) => !prev);
    }
    // On desktop, click does nothing — hover handles it
  }, [isTouchDevice, definition]);

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
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          )}
          <span className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-normal rounded-xl bg-gres-blue px-3 py-2 text-xs font-normal text-white shadow-lg w-max max-w-[220px] text-center animate-in fade-in zoom-in-95 duration-150">
            {definition}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gres-blue" />
          </span>
        </>
      )}
    </span>
  );
}
