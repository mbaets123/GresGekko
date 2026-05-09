"use client";

import { useEffect, useState } from "react";

interface ParagraphProgressProps {
  paragraphId: string;
}

export function ParagraphProgress({ paragraphId }: ParagraphProgressProps) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gresgekko-progress");
      if (raw) {
        const progress: string[] = JSON.parse(raw);
        setDone(progress.includes(paragraphId));
      }
    } catch {
      // ignore
    }
  }, [paragraphId]);

  if (!done) return null;

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[11px] text-green-600">
      ✓
    </span>
  );
}
