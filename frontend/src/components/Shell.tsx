import { useEffect, useState, type ReactNode } from "react";
import { PROJECT_NAME, USE_MOCKS } from "../config";
import { C, LANGS, LANG_NAME, TAB_LABEL, useLang } from "../i18n";

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

/** English demo notice, kept for code that imports it; the strip itself is translated. */
export const DEMO_BANNER = C.demo.en;

function Burger({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-5 w-9">
      <span className={`absolute start-0 h-px w-9 bg-current transition-all duration-300 ${open ? "top-2.5 rotate-45" : "top-0"}`} />
      <span className={`absolute start-0 top-2.5 h-px w-9 bg-current transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
      <span className={`absolute start-0 h-px w-9 bg-current transition-all duration-300 ${open ? "top-2.5 -rotate-45" : "top-5"}`} />
    </span>
  );
}

function Wordmark() {
  return (
    <span dir="ltr" className="flex items-baseline gap-2 font-display">
      <span className="text-[28px] leading-none tracking-tight">{PROJECT_NAME}</span>
      <span lang="ar" dir="rtl" className="text-[22px] leading-none">
        قطرة
      </span>
    </span>
  );
}

/** Small EN · FR · ع switch, shown in the header on every page. */
function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label={C.language[lang]} className="flex items-center text-[15px]">
      {LANGS.map((l, i) => (
        <span key={l.id} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-1.5 text-line">
              |
            </span>
          )}
          <button
            type="button"
            onClick={() => setLang(l.id)}
            aria-pressed={lang === l.id}
            title={LANG_NAME[l.id]}
            className={`px-1 py-1 focus:outline-none focus-visible:outline-2 focus-visible:outline-ink ${
              lang === l.id ? "font-medium underline decoration-2 underline-offset-4" : "text-ink-soft hover:text-ink"
            }`}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  );
}

// App shell: demo strip, header (menu · wordmark · language + link), full-screen menu, footer.
// Pages that must be shell-less (e.g. the passport page) simply don't render this component.
export default function Shell({ tabs, active, onSelect, children }: Props) {
  const { lang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (id: string) => {
    setMenuOpen(false);
    onSelect(id);
  };
  const label = (t: ShellTab) => TAB_LABEL[t.id]?.[lang] ?? t.label;

  useEffect(() => {
    window.scrollTo({ top: 0 }); // newer browsers return a Promise here: keep it out of the effect's return
  }, [active]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const current = tabs.find((t) => t.id === active);
  const shortcut = tabs.find((t) => t.id === "compatibility");

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <div role="note" className="bg-ink px-4 py-2 text-center text-[15px] text-cream">
        {C.demo[lang]}
        {USE_MOCKS && <span className="ms-3 underline underline-offset-4">mock API</span>}
      </div>

      <header className="sticky top-0 z-[1000] border-b border-line bg-cream">
        <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8">
          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label={C.openMenu[lang]}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="py-2 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              <Burger open={false} />
            </button>
            {current && <span className="hidden text-[16px] md:inline">{label(current)}</span>}
          </div>
          <a
            href={`#/${tabs[0]?.id ?? ""}`}
            onClick={(e) => {
              e.preventDefault();
              go(tabs[0].id);
            }}
            aria-label={PROJECT_NAME}
          >
            <Wordmark />
          </a>
          <div className="flex items-center justify-end gap-5">
            <LangSwitch />
            {shortcut && (
              <a
                href={`#/${shortcut.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(shortcut.id);
                }}
                className="link hidden text-[16px] lg:inline"
              >
                {C.safe[lang]}
              </a>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[1200] flex flex-col overflow-y-auto bg-olive" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mx-auto grid h-20 w-full max-w-7xl shrink-0 grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8">
            <button
              type="button"
              aria-label={C.closeMenu[lang]}
              onClick={() => setMenuOpen(false)}
              className="justify-self-start py-2 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              <Burger open />
            </button>
            <Wordmark />
            <span />
          </div>
          <nav aria-label="Main sections" className="flex flex-1 items-center justify-center px-5 py-10">
            <ol className="grid w-full max-w-4xl gap-x-16 gap-y-4 md:grid-cols-2">
              {tabs.map((t, i) => (
                <li key={t.id} className="fade-up" style={{ animationDelay: `${i * 35}ms` }}>
                  <a
                    href={`#/${t.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(t.id);
                    }}
                    aria-current={active === t.id ? "page" : undefined}
                    className="group flex items-baseline gap-4 border-b border-olive-deep pb-3"
                  >
                    <span className="text-[15px]">{String(i + 1).padStart(2, "0")}</span>
                    <span
                      className={`font-display text-4xl leading-tight transition-transform duration-300 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 ${
                        active === t.id ? "underline decoration-2 underline-offset-8" : ""
                      }`}
                    >
                      {label(t)}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <p className="pb-8 text-center text-[15px]">{C.area[lang]}</p>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="bg-khaki px-8 py-16 text-center">
        <p className="font-display text-4xl">{PROJECT_NAME}</p>
        <p className="mx-auto mt-4 max-w-sm">{C.tagline[lang]}</p>
      </footer>
    </div>
  );
}
