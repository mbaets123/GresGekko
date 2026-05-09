export default function ChapterLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 animate-pulse">
      <div className="mb-8">
        <div className="h-4 w-20 rounded-full bg-gres-yellow/30 mb-2" />
        <div className="h-8 w-48 rounded-xl bg-gres-blue/10 mb-2" />
        <div className="h-4 w-72 rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-gres-blue/10 bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gres-yellow/20" />
              <div className="h-5 w-32 rounded bg-gres-blue/10" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
