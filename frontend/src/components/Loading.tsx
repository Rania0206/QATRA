export default function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-12 text-[16px]">
      <span className="h-px w-10 animate-pulse bg-ink" />
      <span>{label}</span>
      <span className="h-px w-10 animate-pulse bg-ink" />
    </div>
  );
}
