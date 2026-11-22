import type { ReactNode } from "react";

export interface Part {
  key: string;
  value: number; // positive size of the part
  swatch: React.CSSProperties; // colour and/or stripes, so a part is never told by colour alone
  label: ReactNode;
  amount: ReactNode; // already formatted, with sign
  tone?: string; // text colour class of the amount
}

export const SUN = "#d99a1c";
export const LEAF = "#5e7740";
export const STRIPES = { background: "repeating-linear-gradient(45deg, #7a7468 0 2px, #fcf7f1 2px 5px)", border: "1px solid #7a7468" };

/** One horizontal bar split in proportion to its parts, with a line per part underneath (label + amount). Plain divs. */
export default function SplitBar({ parts, ariaLabel }: { parts: Part[]; ariaLabel: string }) {
  const shown = parts.filter((p) => p.value > 0);
  const total = shown.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      {total > 0 && (
        <div role="img" aria-label={ariaLabel} dir="ltr" className="flex h-5 w-full overflow-hidden border border-ink">
          {shown.map((p) => (
            <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, ...p.swatch }} />
          ))}
        </div>
      )}
      <ul className="mt-4">
        {parts.map((p) => (
          <li key={p.key} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
            <span aria-hidden="true" className="mt-1.5 inline-block h-3.5 w-3.5 shrink-0" style={p.swatch} />
            <span className="min-w-0 flex-1 text-[17px] leading-snug">{p.label}</span>
            <span dir="ltr" className={`shrink-0 text-[18px] font-medium ${p.tone ?? ""}`}>
              {p.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
