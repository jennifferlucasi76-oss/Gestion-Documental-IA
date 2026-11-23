export function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden w-72 shrink-0 border-r border-ue-border bg-white p-5 lg:block">
        <div className="h-12 animate-pulse rounded-xl bg-ue-crimson-soft/70" />
        <div className="mt-6 space-y-2.5">
          <div className="h-10 animate-pulse rounded-xl bg-ue-crimson-soft/60" />
          <div className="h-9 animate-pulse rounded-xl bg-ue-crimson-soft/40" />
          <div className="h-9 animate-pulse rounded-xl bg-ue-crimson-soft/40" />
          <div className="h-9 animate-pulse rounded-xl bg-ue-crimson-soft/40" />
        </div>
      </div>
      <div className="flex-1">
        <div className="h-16 bg-ue-crimson" />
        <div className="mx-auto max-w-6xl space-y-6 p-8">
          <div className="h-32 animate-pulse rounded-3xl bg-white border border-ue-border" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-28 animate-pulse rounded-2xl bg-white border border-ue-border" />
            <div className="h-28 animate-pulse rounded-2xl bg-white border border-ue-border" />
            <div className="h-28 animate-pulse rounded-2xl bg-white border border-ue-border" />
            <div className="h-28 animate-pulse rounded-2xl bg-white border border-ue-border" />
          </div>
        </div>
      </div>
    </div>
  );
}
