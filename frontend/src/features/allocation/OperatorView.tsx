import { useMemo } from "react";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Skeleton } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { fmtDateL, useLang } from "../../i18n";
import AllocationCard, { CardSkeleton } from "./AllocationCard";
import { DemoTag, Notes } from "./Notes";
import { usePlan } from "./data";
import { A, fmtMoney, fmtN } from "./texts";

/*
 * DEMO ONLY. Operator view: every farm's water for today, for the plant manager / CRDA.
 * Not access control: hidden by default, turned on with #/allocation?view=operator (see compatibility/OperatorView.tsx).
 */
export default function OperatorAllocation() {
  const { lang } = useLang();
  const plan = usePlan();
  const d = plan.data;

  const byFarm = useMemo(() => new Map((d?.allocation.items ?? []).map((i) => [i.farm_id, i])), [d]);
  const money = useMemo(() => new Map((d?.savings?.items ?? []).map((i) => [i.farm_id, i])), [d]);
  const compat = useMemo(() => new Map((d?.compat?.items ?? []).map((i) => [i.farm_id, i])), [d]);
  const empty = d && d.allocation.items.length === 0;

  const tiles = d && [
    { label: A.sumShared[lang], value: fmtN(d.allocation.items.reduce((s, i) => s + i.m3, 0), lang), unit: A.m3[lang] },
    { label: A.sumReplaced[lang], value: fmtN(d.allocation.fresh_replaced_m3, lang), unit: A.m3[lang] },
    { label: A.sumSolar[lang], value: fmtN(d.allocation.solar_share * 100, lang, 0), unit: "%" },
    { label: A.sumEnergy[lang], value: fmtN(d.allocation.energy_kwh, lang, 0), unit: "kWh" },
    ...(d.savings
      ? [{ label: A.sumMoney[lang], value: fmtMoney(d.savings.day.farmer_net_tnd, lang), unit: A.tnd[lang], note: A.estimate[lang] }]
      : []),
  ];

  return (
    <>
      <Band tone="olive" className="md:py-20">
        <p role="note" className="mx-auto mb-8 max-w-2xl border-2 border-ink px-4 py-2 text-center text-[15px] font-medium">
          {A.opBanner[lang]}
        </p>
        <Intro as="h1" size="xl" eyebrow={A.eyebrow[lang]} title={A.title[lang]}>
          <p>{A.leadAll[lang]}</p>
          {d?.savings?.date && (
            <p className="mt-4 text-[16px]">
              {A.planFor[lang]} {fmtDateL(d.savings.date, lang)}
            </p>
          )}
        </Intro>
        <div className="mt-8 text-center">
          <a href="#/allocation?view=farmer" className="link text-[15px]">
            {A.opBack[lang]}
          </a>
        </div>
      </Band>

      <Band tone="cream" wide>
        {USE_MOCKS && <p className="mb-6 text-center text-[15px]">{A.mockNote[lang]}</p>}
        {plan.error ? (
          <ErrorBox error={plan.error} onRetry={plan.reload} />
        ) : !d ? (
          <div aria-busy="true">
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : empty ? (
          <p className="text-center text-[17px]">{A.empty[lang]}</p>
        ) : (
          <>
            <dl className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {tiles!.map((t) => (
                <div key={t.label} className="min-w-0 border border-line bg-white px-4 py-3">
                  <dt className="text-[15px] text-ink-soft">{t.label}</dt>
                  <dd className="font-display text-[28px] font-medium leading-tight">
                    <span dir="ltr">{t.value}</span> <span className="text-[0.55em]">{t.unit}</span>
                  </dd>
                  {"note" in t && <dd className="text-[14px] text-ink-soft">{t.note}</dd>}
                </div>
              ))}
            </dl>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {d.farms.map((f) => {
                const item = byFarm.get(f.id);
                return item ? (
                  <AllocationCard key={f.id} farm={f} item={item} money={money.get(f.id)} compat={compat.get(f.id)} lang={lang} />
                ) : null;
              })}
            </div>
            <Notes warnings={[...d.allocation.warnings, ...(d.savings?.warnings ?? []).filter((w) => !w.startsWith("Season and year"))]} lang={lang} />
            <DemoTag lang={lang} />
          </>
        )}
      </Band>
    </>
  );
}
