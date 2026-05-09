export default function ParagraphLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 animate-pulse">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1 space-y-8">
          {/* Title skeleton */}
          <div>
            <div className="mb-2 h-4 w-16 rounded-full bg-gres-yellow/30" />
            <div className="h-8 w-64 rounded-xl bg-gres-blue/10" />
          </div>

          {/* Leerdoelen & Begrippen skeleton */}
          <div className="rounded-2xl border border-gres-yellow/20 bg-gres-yellow/10 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="h-5 w-40 rounded bg-gres-blue/10" />
                <div className="h-4 w-full rounded bg-gres-blue/5" />
                <div className="h-4 w-3/4 rounded bg-gres-blue/5" />
                <div className="h-4 w-5/6 rounded bg-gres-blue/5" />
              </div>
              <div className="space-y-3">
                <div className="h-5 w-32 rounded bg-gres-blue/10" />
                <div className="flex flex-wrap gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-7 w-20 rounded-full bg-white/60" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Video + AI skeleton */}
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-gres-yellow/20 bg-card">
              <div className="border-b border-gres-yellow/20 bg-gres-yellow/10 px-5 py-3">
                <div className="h-4 w-24 rounded bg-gres-blue/10" />
              </div>
              <div className="p-4">
                <div className="aspect-video w-full rounded-xl bg-gres-blue/5" />
              </div>
            </div>
            <div className="rounded-2xl border border-gres-yellow/20 bg-card h-[350px] sm:h-[400px] lg:h-[500px]">
              <div className="border-b border-gres-yellow/20 bg-gres-yellow/10 px-4 py-3">
                <div className="h-4 w-28 rounded bg-gres-blue/10" />
              </div>
              <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
                <div className="h-16 w-16 rounded-full bg-gres-yellow/20" />
                <div className="h-4 w-40 rounded bg-gres-blue/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
