"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConceptChipProps {
  term: string;
  definition?: string;
}

export function ConceptChip({ term, definition }: ConceptChipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        onClick={() => definition && setOpen(!open)}
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
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-normal rounded-xl bg-gres-blue px-3 py-2 text-xs font-normal text-white shadow-lg w-max max-w-[220px] text-center animate-in fade-in zoom-in-95 duration-150">
            {definition}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gres-blue" />
          </span>
        </>
      )}
    </span>
  );
}
