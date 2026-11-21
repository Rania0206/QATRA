import type { ReactNode } from "react";
import "../_qatra-editorial.css";

/** Editorial screen wrapper: cream page, scoped tokens (.q-screen). Bleeds over the shell's main padding. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="q-screen -mx-3 -my-4 min-h-[calc(100vh-8rem)] px-4 py-6 sm:-mx-4 sm:-my-6 sm:px-6 sm:py-8">
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export type Tone = "ok" | "warn" | "bad" | "ink";

const TONE: Record<Tone, string> = {
  ok: "bg-[var(--q-ok)] text-white border-[var(--q-ok)]",
  warn: "bg-[var(--q-warn)] text-[var(--q-ink)] border-[var(--q-warn)]", // ink text: white fails contrast on orange
  bad: "bg-[var(--q-bad)] text-white border-[var(--q-bad)]",
  ink: "bg-[var(--q-paper)] text-[var(--q-ink)] border-[var(--q-ink)]",
};

/** Square-ish status badge: icon + mono uppercase label. */
export function Badge({
  tone,
  icon,
  label,
  title,
  size = "md",
}: {
  tone: Tone;
  icon: string;
  label: string;
  title?: string;
  size?: "md" | "lg" | "xl";
}) {
  const sz =
    size === "xl"
      ? "w-full justify-center px-4 py-2.5 text-xl"
      : size === "lg"
        ? "px-3 py-1.5 text-lg"
        : "px-2.5 py-1 text-base";
  return (
    <span
      title={title}
      className={`q-mono inline-flex items-center gap-2 whitespace-nowrap rounded-[2px] border font-semibold uppercase tracking-wide ${TONE[tone]} ${sz}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`q-skeleton ${className}`} />;
}

/** Segmented control: 1px ink border, square corners, active = solid ink. */
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
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`q-mono px-4 py-2 text-base font-semibold uppercase transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--q-accent)] ${
              i > 0 ? "border-l border-[var(--q-ink)]" : ""
            } ${on ? "bg-[var(--q-ink)] text-[var(--q-paper)]" : "text-[var(--q-ink)] hover:bg-[var(--q-hover)]"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Section title: Archivo 800 uppercase over a dashed divider. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="q-dash flex flex-wrap items-end justify-between gap-3 pt-4">
      <h3 className="q-title text-[22px]">{children}</h3>
      {right}
    </div>
  );
}
