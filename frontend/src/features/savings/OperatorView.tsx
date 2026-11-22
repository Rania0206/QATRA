import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Pill, Skeleton } from "../../components/ui";
import { useLang } from "../../i18n";
import { DemoTag } from "../allocation/Notes";
import { farmTitle, fmtMoney, fmtN } from "../allocation/texts";
import HowCalculated from "./HowCalculated";
import PricesPanel from "./PricesPanel";
import { useSavings } from "./data";
import { S } from "./texts";

/*
 * DEMO ONLY. Operator view: the savings of every farm and of the whole area, for the plant manager / CRDA.
 * Not access control: hidden by default, turned on with #/savings?view=operator (see compatibility/OperatorView.tsx).
 */
export default function OperatorSavings() {
  const { lang } = useLang();
  const sv = useSavings();
  const d = sv.data;
  const r = d?.report;
  const current = Object.fromEntries((r?.assumptions ?? []).map((a) => [a.name, a.value]));
  const money0 = (v: number) => fmtN(v, lang, 0);

  const totals = r && [
    { label: S.day[lang], t: r.day, tag: S.estimate[lang], dec: 2 },
    { label: S.season[lang], t: r.season, tag: S.projection[lang], dec: 0 },
    { label: S.year[lang], t: r.year, tag: S.projection[lang], dec: 0 },
  ];

  return (
    <>
      <Band tone="olive" className="md:py-20">
        <p role="note" className="mx-auto mb-8 max-w-2xl border-2 border-ink px-4 py-2 text-center text-[15px] font-medium">
          {S.opBanner[lang]}
        </p>
        <Intro as="h1" size="xl" eyebrow={S.eyebrow[lang]} title={S.title[lang]}>
          <p>{S.leadAll[lang]}</p>
        </Intro>
        <div className="mt-8 text-center">
          <a href="#/savings?view=farmer" className="link text-[15px]">
            {S.opBack[lang]}
          </a>
        </div>
      </Band>

      <Band tone="cream" wide>
        {sv.error ? (
          <ErrorBox error={sv.error} onRetry={sv.reload} />
        ) : !d || !r ? (
          <div aria-busy="true" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        ) : r.items.length === 0 ? (
          <p className="text-center text-[17px]">{S.empty[lang]}</p>
        ) : (
          <>
            <h2 className="sr-only">{S.total[lang]}</h2>
            <dl className="grid gap-3 sm:grid-cols-3">
              {totals!.map(({ label, t, tag, dec }) => (
                <div key={label} className="min-w-0 border border-line bg-white px-5 py-4">
                  <dt className="flex flex-wrap items-center justify-between gap-2 text-[16px] text-ink-soft">
                    {S.total[lang]} · {label}
                    <Pill tone="neutral">{tag}</Pill>
                  </dt>
                  <dd className="mt-1 font-display text-[40px] font-medium leading-tight">
                    <span dir="ltr">{dec ? fmtMoney(t.farmer_net_tnd, lang) : money0(t.farmer_net_tnd)}</span> <span className="text-[0.45em]">{S.tnd[lang]}</span>
                  </dd>
                  <dd className="text-[15px] text-ink-soft">
                    {S.farmersKeep[lang]} · {S.qatraShare[lang]}: <span dir="ltr">{dec ? fmtMoney(t.qatra_fee_tnd, lang) : money0(t.qatra_fee_tnd)}</span> {S.tnd[lang]}
                  </dd>
                </div>
              ))}
            </dl>

            <section className="mt-10" aria-label={S.tableTitle[lang]}>
              <h2 className="text-3xl sm:text-4xl">{S.tableTitle[lang]}</h2>
              <p className="mt-1 text-[15px] text-ink-soft">{S.colUnit[lang]}</p>
              <div className="mt-4 overflow-x-auto border border-line bg-white">
                <table className="w-full table-fixed border-collapse text-[13px] sm:table-auto sm:text-[16px]">
                  <thead>
                    <tr className="border-b border-ink text-start">
                      <th scope="col" className="w-[22%] px-1.5 py-2 text-start font-medium sm:px-3">{S.colFarm[lang]}</th>
                      <th scope="col" className="px-1 py-2 text-end font-medium sm:px-3">{S.colM3[lang]}</th>
                      <th scope="col" className="px-1 py-2 text-end font-medium sm:px-3"><span className="sm:hidden">{S.colElecS[lang]}</span><span className="hidden sm:inline">{S.colElec[lang]}</span></th>
                      <th scope="col" className="px-1 py-2 text-end font-medium sm:px-3"><span className="sm:hidden">{S.colFertS[lang]}</span><span className="hidden sm:inline">{S.colFert[lang]}</span></th>
                      <th scope="col" className="px-1 py-2 text-end font-medium sm:px-3"><span className="sm:hidden">{S.colWaterS[lang]}</span><span className="hidden sm:inline">{S.colWater[lang]}</span></th>
                      <th scope="col" className="px-1 py-2 text-end font-medium sm:px-3">{S.colNet[lang]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.items.map((i) => {
                      const farm = d.farms.find((f) => f.id === i.farm_id);
                      const blocked = i.status === "blocked";
                      return (
                        <tr key={i.farm_id} className="border-b border-line last:border-0">
                          <th scope="row" className="px-1.5 py-2 text-start font-normal sm:px-3">
                            <span className="block truncate">{farm ? farmTitle(farm) : i.farm_id}</span>
                            {blocked && <span className="block text-[12px] text-bad sm:text-[14px]">{S.notAllowed[lang]}</span>}
                          </th>
                          <td dir="ltr" className="px-1 py-2 text-end sm:px-3">{fmtN(i.m3, lang)}</td>
                          <td dir="ltr" className="px-1 py-2 text-end sm:px-3">{fmtMoney(i.electricity_saved_tnd, lang)}</td>
                          <td dir="ltr" className="px-1 py-2 text-end sm:px-3">{fmtMoney(i.fertiliser_value_tnd, lang)}</td>
                          <td dir="ltr" className="px-1 py-2 text-end text-bad sm:px-3">{i.water_cost_tnd ? `−${fmtMoney(i.water_cost_tnd, lang)}` : fmtMoney(0, lang)}</td>
                          <td dir="ltr" className="px-1 py-2 text-end font-medium sm:px-3">{fmtMoney(i.net_saving_tnd, lang)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-ink font-medium">
                      <th scope="row" className="px-1.5 py-2 text-start sm:px-3">{S.total[lang]}</th>
                      <td dir="ltr" className="px-1 py-2 text-end sm:px-3">{fmtN(r.day.m3, lang)}</td>
                      <td dir="ltr" className="px-1 py-2 text-end sm:px-3">{fmtMoney(r.day.electricity_saved_tnd, lang)}</td>
                      <td dir="ltr" className="px-1 py-2 text-end sm:px-3">{fmtMoney(r.day.fertiliser_value_tnd, lang)}</td>
                      <td dir="ltr" className="px-1 py-2 text-end text-bad sm:px-3">−{fmtMoney(r.day.water_cost_tnd, lang)}</td>
                      <td dir="ltr" className="px-1 py-2 text-end sm:px-3">{fmtMoney(r.day.net_saving_tnd, lang)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="mt-2 text-[14px] text-ink-soft">
                {S.estimate[lang]} · {S.colNet[lang]} = {S.colElec[lang]} + {S.colFert[lang]} − {S.colWater[lang]}
              </p>
            </section>

            <PricesPanel defaults={sv.defaults} current={current} overrides={sv.overrides} onCommit={sv.setOverrides} busy={sv.loading} lang={lang} />
            <HowCalculated report={r} lang={lang} />
            <DemoTag lang={lang} />
          </>
        )}
      </Band>
    </>
  );
}
