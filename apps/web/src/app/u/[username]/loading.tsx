export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-5 py-14">
      <div className="flex items-center gap-4">
        <div className="size-14 rounded-full bg-panel" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-48 rounded bg-panel" />
          <div className="h-4 w-28 rounded bg-panel" />
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-[86px] rounded-xl bg-panel" />
        ))}
      </div>
      <div className="mt-14 h-64 rounded-xl bg-panel" />
      <span className="sr-only">Loading profile</span>
    </div>
  );
}
