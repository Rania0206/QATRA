import { useEffect, useState } from "react";
import ErrorBox from "../../components/ErrorBox";
import FarmCodeForm from "../../components/FarmCodeForm";
import { Band, Intro, Pill, Skeleton } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { getFarmCode, saveFarmCode } from "../../farm";
import { useLang } from "../../i18n";
import { DemoTag } from "../allocation/Notes";
import { farmSub, farmTitle, fmtMoney, fmtN } from "../allocation/texts";
import { mainReason } from "../compatibility/format";
import { useOperatorView } from "../compatibility/OperatorView";
import HowCalculated from "./HowCalculated";
import OperatorSavings from "./OperatorView";
import PricesPanel from "./PricesPanel";
import SplitBar, { LEAF, STRIPES, SUN } from "./SplitBar";
import { assumed, daysOf, seasonOf, useSavings } from "./data";
import { S } from "./texts";

/** "What do I save?" - one farm only. A farmer never sees other farms. */
function FarmerSavings() {
  const { lang } = useLang();
  const [farmCode, setFarmCode] = useState<string | null>(getFarmCode);
  const [badCode, setBadCode] = useState(false); // a saved or linked code that does not exist
  const sv = useSavings();
  const d = sv.data;

  const farm = farmCode ? d?.farms.find((f) => f.id.toUpperCase() === farmCode) : undefined;
  const item = farm ? d?.report.items.find((i) => i.farm_id === farm.id) : undefined;
  const compat = farm ? d?.compat?.items.find((i) => i.farm_id === farm.id) : undefined;

  // a remembered or linked code that does not exist: ask again
  useEffect(() => {
    if (farmCode && d && !farm) {
      setBadCode(true);
      setFarmCode(null);
      saveFarmCode(null);
    }
  }, [farmCode, d, farm]);

  const choose = (code: string) => {
    setBadCode(false);
    setFarmCode(code);
    saveFarmCode(code);
  };
  const change = () => {
    setFarmCode(null);
    saveFarmCode(null);
  };

  const blocked = item?.status === "blocked";
  const days = d ? daysOf(d.report) : 150;
  const feePct = d ? assumed(d.report, "qatra_fee_pct") ?? 10 : 10;
  const season = (v: number) => fmtN(seasonOf(v, days), lang, 0);
  const current = Object.fromEntries((d?.report.assumptions ?? []).map((a) => [a.name, a.value]));

  return (
    <>
      <Band tone="olive" className="md:py-24">
        <Intro as="h1" size="xl" eyebrow={S.eyebrow[lang]} title={S.title[lang]}>
          <p>{farmCode ? S.leadOwn[lang] : S.leadCode[lang]}</p>
        </Intro>
        {!farmCode && <FarmCodeForm onSubmit={choose} notFound={badCode} />}
      </Band>

      {farmCode && (
        <Band tone="cream">
          {sv.error ? (
            <ErrorBox error={sv.error} onRetry={sv.reload} />
          ) : !d || !farm ? (
            <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !item ? (
            <p className="text-center text-[length:calc(17px*var(--fs))]">{S.noPlan[lang]}</p>
          ) : (
            <>
              <article className="fade-up mx-auto w-full max-w-3xl border border-line bg-white">
                <div className="space-y-6 px-5 py-6 sm:px-7">
                  <header>
                    <p className="eyebrow">{S.yourFarm[lang]}</p>
                    <h2 className="mt-1 text-3xl sm:text-4xl">{farmTitle(farm)}</h2>
                    <p className="mt-1 text-[length:calc(16px*var(--fs))] text-ink-soft">{farmSub(farm, lang)}</p>
                  </header>

                  <section aria-live="polite">
                    <p className="text-[length:calc(18px*var(--fs))]">{blocked ? S.blockedTitle[lang] : S.seasonLabel[lang]}</p>
                    <p className="mt-1 font-display font-medium leading-none text-[length:calc(64px*var(--fs)*var(--fsn))] sm:text-[length:calc(88px*var(--fs)*var(--fsn))]">
                      <span dir="ltr">{blocked ? "0" : season(item.farmer_net_tnd)}</span>{" "}
                      <span className="text-[0.38em]">{S.tnd[lang]}</span>
                    </p>
                    {blocked ? (
                      <p className="mt-3 text-[length:calc(21px*var(--fs))] leading-snug text-bad">
                        {compat ? mainReason(compat.results, lang, farm.crop) : S.blockedGeneric[lang]}
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[length:calc(17px*var(--fs))]">
                        <Pill tone="neutral">{S.projection[lang]}</Pill>
                        <span>
                          {S.perDay[lang]} <span dir="ltr">{fmtMoney(item.farmer_net_tnd, lang)}</span> {S.tnd[lang]} {S.perDayEnd[lang]} ({S.estimate[lang]})
                        </span>
                      </div>
                    )}
                  </section>

                  {!blocked && (
                    <section>
                      <p className="eyebrow">{S.breakdown[lang]}</p>
                      <div className="mt-3">
                        <SplitBar
                          ariaLabel={S.breakdown[lang]}
                          parts={[
                            {
                              key: "elec",
                              value: item.electricity_saved_tnd,
                              swatch: { background: SUN },
                              label: <>{S.electricity[lang]}{item.electricity_saved_tnd === 0 && <span className="block text-[length:calc(14px*var(--fs))] text-ink-soft">{S.noElec[lang]}</span>}</>,
                              amount: `+${season(item.electricity_saved_tnd)} ${S.tnd[lang]}`,
                            },
                            {
                              key: "fert",
                              value: item.fertiliser_value_tnd,
                              swatch: { background: LEAF },
                              label: S.fertiliser[lang],
                              amount: `+${season(item.fertiliser_value_tnd)} ${S.tnd[lang]}`,
                            },
                            {
                              key: "water",
                              value: item.water_cost_tnd,
                              swatch: STRIPES,
                              label: (
                                <>
                                  {S.waterCost[lang]} <span className="text-[length:calc(14px*var(--fs))] text-ink-soft">({S.deduction[lang]})</span>
                                </>
                              ),
                              amount: `−${season(item.water_cost_tnd)} ${S.tnd[lang]}`,
                              tone: "text-bad",
                            },
                          ]}
                        />
                      </div>
                      <dl className="mt-2 space-y-1 text-[length:calc(16px*var(--fs))]">
                        <div className="flex justify-between gap-4">
                          <dt>{S.before[lang]}</dt>
                          <dd dir="ltr">{season(item.net_saving_tnd)} {S.tnd[lang]}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-[length:calc(17px*var(--fs))] leading-snug">
                        {{
                          en: `QATRA keeps ${fmtN(feePct, lang, 1)}% of the saving (${season(item.qatra_fee_tnd)} TND); you keep the rest: ${season(item.farmer_net_tnd)} TND.`,
                          fr: `QATRA garde ${fmtN(feePct, lang, 1)} % de l'économie (${season(item.qatra_fee_tnd)} TND) ; vous gardez le reste : ${season(item.farmer_net_tnd)} TND.`,
                          ar: `تحتفظ قطرة بـ ${fmtN(feePct, lang, 1)}% من الوفر (${season(item.qatra_fee_tnd)} TND)؛ وتحتفظ أنت بالباقي: ${season(item.farmer_net_tnd)} TND.`,
                        }[lang]}
                      </p>
                      <p className="mt-2 text-[length:calc(14px*var(--fs))] text-ink-soft">
                        {S.projection[lang]}: {S.honest1[lang]}
                      </p>
                    </section>
                  )}

                  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[length:calc(15px*var(--fs))]">
                    <span className="text-ink-soft">{S.privacy[lang]}</span>
                    <button type="button" onClick={change} className="link">
                      {S.change[lang]}
                    </button>
                  </footer>
                </div>
              </article>

              {!blocked && (
                <>
                  <PricesPanel
                    defaults={sv.defaults}
                    current={current}
                    overrides={sv.overrides}
                    onCommit={sv.setOverrides}
                    busy={sv.loading}
                    lang={lang}
                  />
                  <HowCalculated report={d.report} lang={lang} />
                </>
              )}
              {USE_MOCKS && blocked && <p className="mt-6 text-center text-[length:calc(15px*var(--fs))]">{S.mockNote[lang]}</p>}
              <DemoTag lang={lang} />
            </>
          )}
        </Band>
      )}
    </>
  );
}

/** Farmers get their own farm only. The all-farms operator view is a hidden demo mode (#/savings?view=operator). */
export default function SavingsTab() {
  return useOperatorView() ? <OperatorSavings /> : <FarmerSavings />;
}
