import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { PROJECT_NAME } from "../config";
import { C, LANGS, LANG_NAME, TAB_LABEL, useLang } from "../i18n";
import { ROLES, RT, type RoleId } from "../roles";

export interface ShellTab {
  id: string;
  label: string;
}

interface Props {
  tabs: ShellTab[];
  active: string;
  onSelect: (id: string) => void;
  role: RoleId | null;
  onRole: (r: RoleId | null) => void;
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
      <span className="text-[length:calc(28px*var(--fs)*var(--fsn))] leading-none tracking-tight">{PROJECT_NAME}</span>
      <span lang="ar" dir="rtl" className="text-[length:calc(22px*var(--fs))] leading-none">
        قطرة
      </span>
    </span>
  );
}

/** Small EN · FR · ع switch, shown in the header on every page. */
function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label={C.language[lang]} className="flex items-center text-[length:calc(15px*var(--fs))]">
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
export default function Shell({ tabs, active, onSelect, role, onRole, children }: Props) {
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

  const roleInfo = ROLES.find((r) => r.id === role);
  const relevant = roleInfo?.tabs ?? null; // null: no role, every tab is listed
  const menuTabs = relevant ? tabs.filter((t) => relevant.includes(t.id)) : tabs;
  const home = roleInfo ? tabs.find((t) => t.id === roleInfo.home) : undefined;
  const current = tabs.find((t) => t.id === active);
  const shortcut = tabs.find((t) => t.id === "compatibility");

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <header className="sticky top-0 z-[1000] border-b border-line bg-cream">
        {/* phones: menu + wordmark on the first line, role and language wrap onto a second one (no sideways scroll); from sm: the original 3-column row */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2 sm:grid sm:h-20 sm:grid-cols-[1fr_auto_1fr] sm:py-0 sm:px-8">
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
            {current && <span className="hidden text-[length:calc(16px*var(--fs))] md:inline">{label(current)}</span>}
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
          <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-5">
            <label className="flex min-w-0 items-center gap-2 text-[length:calc(15px*var(--fs))]">
              <span className="hidden text-ink-soft sm:inline">{RT.select[lang]}</span>
              <select
                value={role ?? ""}
                onChange={(e) => onRole((e.target.value || null) as RoleId | null)}
                aria-label={RT.select[lang]}
                className="rounded border border-line bg-cream px-2 py-1 text-[length:calc(15px*var(--fs))] focus:outline-none focus-visible:outline-2 focus-visible:outline-ink"
              >
                <option value="">{RT.none[lang]}</option>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label[lang]}
                  </option>
                ))}
              </select>
            </label>
            <LangSwitch />
            {shortcut && (
              <a
                href={`#/${shortcut.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(shortcut.id);
                }}
                className="link hidden text-[length:calc(16px*var(--fs))] lg:inline"
              >
                {C.safe[lang]}
              </a>
            )}
          </div>
        </div>
      </header>

      {roleInfo && (
        <div role="note" className="bg-sand px-4 py-2 text-center text-[length:calc(15px*var(--fs))] text-ink-soft">
          <p>
            <span className="font-medium text-ink">{roleInfo.label[lang]}</span> · {roleInfo.about[lang]}{" "}
            <span className="whitespace-nowrap">({roleInfo.operator ? RT.allFarms[lang] : RT.oneFarm[lang]})</span>
          </p>
          {relevant && !relevant.includes(active) && home && (
            <p className="mt-1 text-bad">
              {RT.notMine[lang]}{" "}
              <a
                href={`#/${home.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(home.id);
                }}
                className="link"
              >
                {RT.goTo[lang]} {label(home)}
              </a>
            </p>
          )}
        </div>
      )}

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
            <ol
              className="grid w-full max-w-4xl gap-x-16 gap-y-4 md:grid-flow-col md:grid-cols-2 md:[grid-template-rows:repeat(var(--rows),auto)]"
              style={{ "--rows": Math.ceil(menuTabs.length / 2) } as CSSProperties}
            >
              {menuTabs.map((t, i) => (
                <li
                  key={t.id}
                  className="fade-up"
                  data-relevant={relevant ? "true" : undefined}
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <a
                    href={`#/${t.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(t.id);
                    }}
                    aria-current={active === t.id ? "page" : undefined}
                    className="group flex items-baseline gap-4 border-b border-olive-deep pb-3"
                  >
                    <span className="w-7 shrink-0 text-[length:calc(15px*var(--fs))] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
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
          <p className="pb-2 text-center text-[length:calc(15px*var(--fs))]">{RT.notice[lang]}</p>
          <p className="pb-8 text-center text-[length:calc(15px*var(--fs))]">{C.area[lang]}</p>
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
