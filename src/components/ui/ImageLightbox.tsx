"use client";

import { useState } from "react";

interface ImageLightboxProps {
  src: string;
  alt: string;
}

export function ImageLightbox({ src, alt }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative w-full cursor-zoom-in"
      >
        <img src={src} alt={alt} className="w-full rounded-xl" />
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/10">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-gres-blue opacity-0 shadow transition-opacity group-hover:opacity-100">
            🔍 Vergroten
          </span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white transition hover:bg-white/30"
          >
            ✕ Sluiten
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
