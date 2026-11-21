import type { ReactNode } from "react";
import { PROJECT_NAME, USE_MOCKS } from "../config";

export interface ShellTab {
  id: string;
  label: string;
}

interface Props {
  tabs: ShellTab[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}

export const DEMO_BANNER =
  "Demo data: simulated scenario inspired by Zaouiet-Sousse. Not real operations.";

// App shell: header, persistent banner, tab nav, and a `children` slot for the active feature.
// Pages that must be shell-less (e.g. the passport page) simply don't render this component.
export default function Shell({ tabs, active, onSelect, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="bg-teal-800 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="flex items-baseline gap-2 text-xl font-bold tracking-tight">
            <span>{PROJECT_NAME}</span>
            <span lang="ar" dir="rtl" className="text-2xl font-semibold">
              قطرة
            </span>
          </h1>
          {USE_MOCKS && (
            <span className="shrink-0 rounded bg-teal-900 px-2 py-0.5 text-xs">mock API</span>
          )}
        </div>
      </header>

      <div role="note" className="bg-amber-100 text-amber-900">
        <p className="mx-auto max-w-7xl px-4 py-2 text-sm font-medium">{DEMO_BANNER}</p>
      </div>

      <nav aria-label="Main sections" className="sticky top-0 z-[1000] border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-4">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#/${t.id}`}
              onClick={(e) => {
                e.preventDefault();
                onSelect(t.id);
              }}
              aria-current={active === t.id ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                active === t.id
                  ? "border-teal-700 text-teal-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4 sm:py-6">{children}</main>
    </div>
  );
}
