function Row({ h = 'h-16' }) {
  return <div className={`${h} rounded-xl bg-muted animate-pulse`} />;
}

const LAYOUTS = {
  cards: (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  ),

  list: (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => <Row key={i} />)}
    </div>
  ),

  profile: (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-36 bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
      <div className="h-48 rounded-2xl bg-muted animate-pulse" />
      <div className="h-28 rounded-2xl bg-muted animate-pulse" />
      <div className="h-20 rounded-2xl bg-muted animate-pulse" />
    </div>
  ),

  dashboard: (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-16 rounded-xl bg-muted animate-pulse" />
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  ),

  calendar: (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex-1 h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => <Row key={i} />)}
      </div>
    </div>
  ),
};

export default function PageSkeleton({ icon, message, layout = 'list' }) {
  const content = LAYOUTS[layout] ?? LAYOUTS.list;

  return (
    <div className="space-y-5">
      {(icon || message) && (
        <div className="flex flex-col items-center gap-2 pt-4 pb-2">
          {icon && <span className="text-3xl select-none">{icon}</span>}
          {message && (
            <p className="text-sm text-muted-foreground font-medium">{message}</p>
          )}
        </div>
      )}
      {content}
    </div>
  );
}
