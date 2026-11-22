import type { Allocation, Decision, Farm, FarmCompatibility, SavingsItem } from "../../api/types";
import { Skeleton } from "../../components/ui";
import type { Lang } from "../../i18n";
import { DECISION } from "../compatibility/format";
import { A, farmSub, farmTitle, fmtMoney, fmtN, reasonText } from "./texts";

/** Solid status colour + symbol, same as the Compatibility screen. */
const VERDICT: Record<Decision, { bg: string; symbol: string }> = {
  compatible: { bg: "bg-ok", symbol: "✓" },
  conditional: { bg: "bg-warn", symbol: "!" },
  blocked: { bg: "bg-bad", symbol: "✕" },
};

/** A plan status ("allocated", "capped" ...) in the words of the Compatibility screen. */
export const decisionOf = (status: string): Decision =>
  status === "blocked" ? "blocked" : status === "conditional" ? "conditional" : "compatible";

export function CardSkeleton() {
  return (
    <div className="flex flex-col border border-line" aria-hidden="true">
      <Skeleton className="h-9 w-full" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}

interface Props {
  farm: Farm;
  item: Allocation["items"][number];
  money?: SavingsItem;
  compat?: FarmCompatibility;
  lang: Lang;
  large?: boolean; // the farmer's own card
  onChange?: () => void; // farmer view: "Not your farm? Change"
}

/** One farm's water for today: verdict, litres, money, one plain reason. */
export default function AllocationCard({ farm, item, money, compat, lang, large = false, onChange }: Props) {
  const d = decisionOf(item.status);
  const v = VERDICT[d];
  const estimate = money?.tag.status === "PROJECTION" ? A.projection[lang] : A.estimate[lang];
  return (
    <article className={`flex h-full flex-col border border-line bg-white ${large ? "fade-up mx-auto w-full max-w-2xl" : ""}`}>
      <div
        className={`flex items-center gap-2 font-display font-medium text-white ${v.bg} ${large ? "gap-3 px-6 py-4 text-[length:calc(26px*var(--fs)*var(--fsn))]" : "px-4 py-2 text-[length:calc(17px*var(--fs))]"}`}
      >
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center rounded-full border-white leading-none ${
            large ? "h-9 w-9 border-2 text-[length:calc(18px*var(--fs))]" : "h-5 w-5 border-[1.5px] text-[length:calc(12px*var(--fs))]"
          }`}
        >
          {v.symbol}
        </span>
        {DECISION[d][lang]}
      </div>

      <div className={`flex flex-1 flex-col ${large ? "gap-7 px-6 py-7" : "gap-3 px-4 pb-4 pt-3"}`}>
        <header>
          {large && <p className="eyebrow">{A.yourFarm[lang]}</p>}
          <h3 className={`font-display font-medium leading-tight ${large ? "mt-1 text-4xl" : "text-[length:calc(21px*var(--fs))]"}`}>{farmTitle(farm)}</h3>
          <p className={`text-ink-soft ${large ? "mt-1 text-[length:calc(16px*var(--fs))]" : "text-[length:calc(15px*var(--fs))]"}`}>{farmSub(farm, lang)}</p>
        </header>

        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[length:calc(15px*var(--fs))] text-ink-soft">{A.waterToday[lang]}</dt>
            <dd className={`font-display font-medium leading-tight ${large ? "text-4xl" : "text-[length:calc(26px*var(--fs)*var(--fsn))]"}`}>
              <span dir="ltr">{fmtN(item.m3, lang)}</span> <span className="text-[0.55em]">{A.m3[lang]}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[length:calc(15px*var(--fs))] text-ink-soft">{A.savedToday[lang]}</dt>
            <dd className={`font-display font-medium leading-tight ${large ? "text-4xl" : "text-[length:calc(26px*var(--fs)*var(--fsn))]"}`}>
              {money ? (
                <>
                  <span dir="ltr">{fmtMoney(money.farmer_net_tnd, lang)}</span> <span className="text-[0.55em]">{A.tnd[lang]}</span>
                </>
              ) : (
                "–"
              )}
            </dd>
            {money && <dd className="text-[length:calc(14px*var(--fs))] text-ink-soft">{estimate}</dd>}
          </div>
        </dl>

        <p className={`leading-snug ${large ? "text-[length:calc(21px*var(--fs))]" : "text-[length:calc(16px*var(--fs))]"} ${d === "blocked" ? "text-bad" : ""}`}>
          {reasonText(item, farm, compat, lang)}
        </p>

        {large && onChange && (
          <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[length:calc(15px*var(--fs))]">
            <span className="text-ink-soft">{A.privacy[lang]}</span>
            <button type="button" onClick={onChange} className="link">
              {A.change[lang]}
            </button>
          </footer>
        )}
      </div>
    </article>
  );
}
