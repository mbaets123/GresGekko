"use client";

import { useEffect } from "react";

export function MarkVisited({ paragraphId }: { paragraphId: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gresgekko-progress");
      const progress: string[] = raw ? JSON.parse(raw) : [];
      if (!progress.includes(paragraphId)) {
        progress.push(paragraphId);
        localStorage.setItem("gresgekko-progress", JSON.stringify(progress));
      }
    } catch {
      // ignore
    }
  }, [paragraphId]);

  return null;
}
