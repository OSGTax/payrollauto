export default function Loading() {
  return (
    <div className="mx-auto max-w-xl p-4">
      <div className="mb-3 flex items-end justify-between">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-5 w-16" />
      </div>
      <div className="rounded-xl border border-brand-ink-200 bg-white p-3">
        <div className="skeleton mb-2 h-3 w-32" />
        <div className="skeleton h-3 w-full" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand-ink-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 w-12" />
            </div>
            <div className="skeleton mt-2 h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
