import type { SavingsReport } from "../../api/types";
import { Pill } from "../../components/ui";
import type { Lang } from "../../i18n";
import { warningText } from "../allocation/texts";
import { S, STATUS, assumptionName, assumptionValue } from "./texts";

/** "How we calculated": closed by default. Every assumption with its source and a visible status; TO_VERIFY is highlighted. */
export default function HowCalculated({ report, lang }: { report: SavingsReport; lang: Lang }) {
  const warnings = report.warnings.filter((w) => !w.startsWith("Season and year"));
  return (
    <details className="group mx-auto mt-8 w-full max-w-2xl border border-line bg-white px-5 py-4 sm:px-6">
      <summary className="cursor-pointer list-none text-xl font-medium sm:text-2xl">
        {S.howTitle[lang]} <span className="inline-block transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">›</span>
      </summary>

      <ul className="mt-4 space-y-1 text-[16px] leading-snug">
        <li>• {S.honest1[lang]}</li>
        <li>• {S.honest2[lang]}</li>
      </ul>

      <ul className="mt-4">
        {report.assumptions.map((a) => {
          const st = STATUS[a.status] ?? { label: { en: a.status, fr: a.status, ar: a.status }, tone: "neutral" as const };
          const verify = a.status === "TO_VERIFY";
          return (
            <li key={a.name} className={`border-t border-line py-3 ${verify ? "bg-warn-soft px-3" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-[16px] font-medium">{assumptionName(a, lang)}</span>
                <span dir="ltr" className="text-[16px]">
                  {assumptionValue(a, lang)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Pill tone={st.tone}>{st.label[lang]}</Pill>
              </div>
              <p className="mt-1.5 break-words text-[14px] text-ink-soft">
                {S.source[lang]}: {a.source}
              </p>
            </li>
          );
        })}
      </ul>

      {S.sourceNote[lang] && <p className="mt-2 text-[14px] text-ink-soft">{S.sourceNote[lang]}</p>}
      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[15px]">
          {warnings.map((w) => (
            <li key={w}>• {warningText(w, lang)}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
