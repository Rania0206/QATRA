import type { ReactNode } from "react";
import "../_qatra-editorial.css";

/** Screen wrapper: off-white page, scoped tokens (.q-screen). Bleeds over the shell's main padding. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="q-screen -mx-3 -my-4 min-h-[calc(100vh-8rem)] px-4 py-6 sm:-mx-4 sm:-my-6 sm:px-6 sm:py-8">
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export type Tone = "ok" | "warn" | "bad" | "ink";

/** Thin outlined pill; colour only carries the status. */
const TONE: Record<Tone, { pill: string; dot: string }> = {
  ok: { pill: "text-[var(--q-ok)] border-[var(--q-ok)]", dot: "bg-[var(--q-ok)]" },
  warn: { pill: "text-[var(--q-warn)] border-[var(--q-warn)]", dot: "bg-[var(--q-warn)]" },
  bad: { pill: "text-[var(--q-bad)] border-[var(--q-bad)]", dot: "bg-[var(--q-bad)]" },
  ink: { pill: "text-[var(--q-ink-2)] border-[var(--q-ink-2)]", dot: "bg-[var(--q-ink-2)]" },
};

/** Status badge: dot + label. `icon` is kept for call sites but not drawn (minimal style). */
export function Badge({
  tone,
  label,
  title,
  size = "md",
}: {
  tone: Tone;
  icon?: string;
  label: string;
  title?: string;
  size?: "md" | "lg" | "xl";
}) {
  const sz = size === "md" ? "px-2.5 py-0.5 text-[15px]" : "px-3 py-1 text-base";
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-[2px] border bg-[var(--q-paper)] font-medium ${TONE[tone].pill} ${sz}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${TONE[tone].dot}`} />
      {label}
    </span>
  );
}

/** Coloured dot alone (legends, result rows). */
export function Dot({ tone, className = "" }: { tone: Tone; className?: string }) {
  return <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${TONE[tone].dot} ${className}`} />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`q-skeleton ${className}`} />;
}

/** Segmented control: thin dark frame, square corners, mono labels; active = solid dark. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-[2px] border border-[var(--q-ink)] bg-[var(--q-paper)]">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`q-code px-4 py-1.5 text-[15px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--q-accent)] ${
              on ? "bg-[var(--q-ink)] text-[var(--q-cream)]" : "text-[var(--q-ink)] hover:bg-[var(--q-hover)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Section title over a thin divider. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="q-dash flex flex-wrap items-center justify-between gap-3 pt-5">
      <h3 className="q-title">{children}</h3>
      {right}
    </div>
  );
}
