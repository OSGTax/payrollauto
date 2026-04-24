export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-10 w-36" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand-ink-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton h-6 w-20" />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="skeleton h-8 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
