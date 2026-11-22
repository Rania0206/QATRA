import { C, useLang } from "../i18n";

export default function Loading({ label }: { label?: string }) {
  const { lang } = useLang();
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-12 text-[length:calc(16px*var(--fs))]">
      <span className="h-px w-10 animate-pulse bg-ink" />
      <span>{label ?? C.loading[lang]}</span>
      <span className="h-px w-10 animate-pulse bg-ink" />
    </div>
  );
}
