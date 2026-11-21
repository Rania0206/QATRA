import { useEffect, type ReactNode } from "react";

/* Shared building blocks for every screen. Style tokens live in index.css (@theme). */

export type BandTone = "cream" | "olive" | "blush" | "sand";

const BAND: Record<BandTone, string> = {
  cream: "bg-cream",
  olive: "bg-olive",
  blush: "bg-blush",
  sand: "bg-sand",
};

/** Full-width colour band with a centred column. */
export function Band({
  tone = "cream",
  children,
  className = "",
  wide = false,
  id,
}: {
  tone?: BandTone;
  children: ReactNode;
  className?: string;
  wide?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`${BAND[tone]} px-5 py-20 sm:px-8 md:py-24 ${className}`}>
      <div className={`mx-auto ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{children}</div>
    </section>
  );
}

/** Centred intro: typewriter eyebrow, thin serif title, short paragraph. */
export function Intro({
  eyebrow,
  title,
  children,
  as = "h2",
  size = "md",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  as?: "h1" | "h2";
  size?: "md" | "xl";
}) {
  const H = as;
  return (
    <div className="fade-up mx-auto max-w-2xl text-center">
      {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
      <H className={size === "xl" ? "text-5xl sm:text-6xl md:text-7xl" : "text-4xl sm:text-5xl"}>{title}</H>
      {children && <div className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed">{children}</div>}
    </div>
  );
}

export type Tone = "ok" | "warn" | "bad" | "neutral";

const PILL: Record<Tone, string> = {
  ok: "text-ok border-ok",
  warn: "text-warn border-warn",
  bad: "text-bad border-bad",
  neutral: "text-ink-soft border-ink-soft",
};
const DOT: Record<Tone, string> = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", neutral: "bg-ink-soft" };

/** Thin outlined status pill with a dot; colour only carries the status. */
export function Pill({ tone, children, title, large = false }: { tone: Tone; children: ReactNode; title?: string; large?: boolean }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-2 whitespace-nowrap border bg-cream font-mono ${PILL[tone]} ${
        large ? "px-3 py-1 text-[16px]" : "px-2.5 py-0.5 text-[15px]"
      }`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  return <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT[tone]}`} />;
}

/** Typewriter segmented control (filters, EN/FR). */
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
    <div role="group" aria-label={label} className="inline-flex border border-ink text-[16px]">
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`px-4 py-2 transition-colors duration-200 focus:outline-none focus-visible:underline ${
              i > 0 ? "border-l border-ink" : ""
            } ${on ? "bg-ink text-cream" : "hover:bg-ink/10"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Right-hand side panel on cream; Esc or backdrop closes it. */
export function Drawer({
  label,
  header,
  children,
  onClose,
}: {
  label: string;
  header: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/35" />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-cream">
        <header className="sticky top-0 z-10 border-b border-line bg-cream px-6 pb-5 pt-6">
          <button type="button" onClick={onClose} className="link absolute right-6 top-6 text-[15px]">
            Close
          </button>
          {header}
        </header>
        <div className="space-y-8 px-6 py-6">{children}</div>
      </aside>
    </div>
  );
}
