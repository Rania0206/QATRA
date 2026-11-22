import { useMemo, useRef, useState } from "react";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Pill, Skeleton } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { fmtN } from "../../format";
import { useLang } from "../../i18n";
import { DemoTag } from "../allocation/Notes";
import { assumptionName, assumptionValue, STATUS } from "../savings/texts";
import ScaleChart, { type Row } from "./ScaleChart";
import { MAX_CUSTOM_HA, project, useBusiness } from "./data";
import { Bz, explain, figureName, figureNote, headline, inPractice, pilotLine, warningTexts } from "./texts";

const PRESETS = ["pilot", "ha-100", "ha-1000", "irrigated", "equipped"] as const;
type Choice = (typeof PRESETS)[number] | "custom";

const btn = (on: boolean) =>
  `border border-ink px-3 py-2 text-[16px] transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
    on ? "bg-ink text-cream" : "hover:bg-ink/10"
  }`;

/** Scale-up in dinars: what the pilot's saving per hectare would be at a larger scale. Every figure is a projection. */
export default function BusinessTab() {
  const { lang } = useLang();
  const api = useBusiness();
  const d = api.data;
  const [choice, setChoice] = useState<Choice>("irrigated");
  const [customText, setCustomText] = useState("500");
  const [adoptionPct, setAdoptionPct] = useState(30); // 10-100 %, default 30 %

  const custom = Number(customText.replace(",", "."));
  const customOk = customText.trim() !== "" && Number.isFinite(custom) && custom >= 0 && custom <= MAX_CUSTOM_HA;
  const lastGood = useRef(500); // an invalid entry keeps the last valid number on screen
  if (customOk) lastGood.current = custom;
  const lastCustom = lastGood.current;

  const scenarios = d?.scenarios ?? [];
  const preset = (id: string) => scenarios.find((s) => s.id === id);
  const selectedHa = choice === "custom" ? lastCustom : (preset(choice)?.ha ?? 0);
  const adoption = adoptionPct / 100;
  const now = d ? project(d.pilot, selectedHa, adoption) : undefined;

  const rows: Row[] = useMemo(() => {
    if (!d) return [];
    const list = PRESETS.map((id) => preset(id)).filter((s): s is NonNullable<typeof s> => !!s);
    const base = list.map((s) => ({ id: s.id, ha: s.ha, label: `${fmtN(s.ha, lang, s.ha < 100 ? 1 : 0)} ${Bz.ha[lang]}`, ...pick(project(d.pilot, s.ha, adoption)) }));
    if (choice === "custom") base.push({ id: "custom", ha: lastCustom, label: `${fmtN(lastCustom, lang, lastCustom < 100 ? 1 : 0)} ${Bz.ha[lang]}`, ...pick(project(d.pilot, lastCustom, adoption)) });
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, adoption, lang, choice, lastCustom]);

  const toVerify = d?.assumptions.filter((a) => a.status === "TO_VERIFY") ?? [];
  const reportedFigures = d?.territory.filter((t) => t.key !== "perimeters") ?? [];

  const tiles =
    d && now
      ? [
          { key: "farmers", label: Bz.farmersSave[lang], value: now.farmers, unit: `${Bz.tnd[lang]} ${Bz.perYear[lang]}` },
          { key: "qatra", label: Bz.qatraEarns[lang], value: now.qatra, unit: `${Bz.tnd[lang]} ${Bz.perYear[lang]}` },
          { key: "water", label: Bz.waterSaved[lang], value: now.water, unit: `${Bz.m3[lang]} ${Bz.perYear[lang]}` },
          { key: "kwh", label: Bz.elecSaved[lang], value: now.kwh, unit: `${Bz.kwh[lang]} ${Bz.perYear[lang]}` },
        ]
      : [];

  return (
    <>
      <Band tone="olive" className="md:py-20">
        <Intro as="h1" eyebrow={Bz.eyebrow[lang]} title={d ? headline(selectedHa, lang) : Bz.eyebrow[lang]}>
          <p>{Bz.lead[lang]}</p>
          {d && <p className="mt-4 text-[16px]">{inPractice(adoptionPct, selectedHa * adoption, lang)}</p>}
        </Intro>
      </Band>

      <Band tone="cream" wide>
        <div className="mx-auto max-w-4xl">
          {USE_MOCKS && <p className="mb-6 text-center text-[15px]">{Bz.mockNote[lang]}</p>}
          {api.error ? (
            <ErrorBox error={api.error} onRetry={api.reload} />
          ) : !d ? (
            <div aria-busy="true" className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-36" />
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : scenarios.length === 0 ? (
            <p className="text-center text-[17px]">{Bz.empty[lang]}</p>
          ) : (
            <>
              {/* controls */}
              <section aria-label={Bz.howMany[lang]} className="border border-line bg-white px-4 py-5 sm:px-6">
                <p className="text-[16px] text-ink-soft">{Bz.howMany[lang]}</p>
                <div role="group" aria-label={Bz.howMany[lang]} className="mt-2 flex flex-wrap gap-2">
                  {PRESETS.map((id) => {
                    const s = preset(id);
                    if (!s) return null;
                    const n = fmtN(s.ha, lang, s.ha < 100 ? 1 : 0);
                    const label =
                      id === "pilot"
                        ? `${Bz.pilot[lang]} (${d.pilot.farms_total} ${Bz.pilotFarms[lang]})`
                        : id === "irrigated"
                          ? `${Bz.irrigated[lang]} (${n} ${Bz.ha[lang]})`
                          : id === "equipped"
                            ? `${Bz.equipped[lang]} (${n} ${Bz.ha[lang]})`
                            : `${n} ${Bz.ha[lang]}`;
                    return (
                      <button key={id} type="button" aria-pressed={choice === id} onClick={() => setChoice(id)} className={btn(choice === id)}>
                        {label}
                      </button>
                    );
                  })}
                  <button type="button" aria-pressed={choice === "custom"} onClick={() => setChoice("custom")} className={btn(choice === "custom")}>
                    {Bz.custom[lang]}
                  </button>
                </div>

                {choice === "custom" && (
                  <label className="mt-4 flex max-w-xs flex-col gap-1.5 text-[15px]">
                    <span>{Bz.customLabel[lang]}</span>
                    <span className="flex items-stretch">
                      <input
                        type="number"
                        inputMode="decimal"
                        dir="ltr"
                        min={0}
                        max={MAX_CUSTOM_HA}
                        step="10"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        aria-invalid={!customOk}
                        className={`min-w-0 flex-1 border bg-cream px-3 py-2.5 text-[18px] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${customOk ? "border-ink" : "border-bad"}`}
                      />
                      <span className="flex items-center border border-s-0 border-ink px-3 text-ink-soft">{Bz.ha[lang]}</span>
                    </span>
                    {!customOk && <span className="text-[14px] text-bad">{Bz.customBad[lang]}</span>}
                  </label>
                )}

                <div className="mt-6">
                  <label htmlFor="adoption" className="flex flex-wrap items-baseline justify-between gap-2 text-[16px]">
                    <span>{Bz.adoption[lang]}</span>
                    <span className="font-display text-[28px] font-medium" dir="ltr">
                      {fmtN(adoptionPct, lang, 0)}%
                    </span>
                  </label>
                  <input
                    id="adoption"
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={adoptionPct}
                    onChange={(e) => setAdoptionPct(Number(e.target.value))}
                    aria-valuetext={`${adoptionPct}%`}
                    className="mt-2 h-8 w-full accent-olive-deep"
                  />
                  <p className="mt-1 text-[14px] text-ink-soft">{Bz.adoptionHelp[lang]}</p>
                </div>
              </section>

              {/* the four numbers */}
              <section aria-live="polite" className="mt-6 grid gap-3 sm:grid-cols-2">
                {tiles.map((t) => (
                  <div key={t.key} className="min-w-0 border border-line bg-white px-5 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[17px]">{t.label}</p>
                      <Pill tone="neutral">{Bz.projection[lang]}</Pill>
                    </div>
                    <p className="mt-2 break-words font-display text-[40px] font-medium leading-none sm:text-[46px]" dir="ltr">
                      {fmtN(t.value, lang, 0)}
                    </p>
                    <p className="mt-1.5 text-[15px] text-ink-soft">
                      {t.unit}
                      {t.key === "qatra" && ` · ${fmtN(d.qatra_share_pct, lang, 1)}%`}
                    </p>
                  </div>
                ))}
              </section>

              <p className="mx-auto mt-6 max-w-2xl text-center text-[18px] leading-snug">
                {explain(d.qatra_share_pct, lang)} {Bz.noUpfront[lang]}
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-center text-[14px] text-ink-soft">{Bz.revenueOnly[lang]}</p>

              <ScaleChart rows={rows} selectedId={choice === "custom" ? "custom" : choice} lang={lang} />

              {/* the pilot and the reported hectares */}
              <section className="mt-10 border border-line bg-white px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-2xl sm:text-3xl">{Bz.pilotTitle[lang]}</h2>
                  <Pill tone="neutral">{Bz.projection[lang]}</Pill>
                </div>
                <p className="mt-2 text-[18px] leading-snug">
                  {pilotLine(d.pilot.farms_total, d.pilot.total_area_ha, d.pilot.pilot_ha, d.pilot.farmers_net_tnd_per_ha_season, lang)}
                </p>
                <p className="mt-1 text-[14px] text-ink-soft">{Bz.pilotNote[lang]}</p>

                <h3 className="mt-6 text-xl sm:text-2xl">{Bz.hectaresTitle[lang]}</h3>
                <ul className="mt-2">
                  {reportedFigures.map((t) => (
                    <li key={t.id} className="border-t border-line py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="text-[16px] font-medium">{figureName(t, lang)}</span>
                        <span dir="ltr" className="font-display text-[24px] font-medium">
                          {fmtN(t.value, lang, 0)} {Bz.ha[lang]}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Pill tone="ok">{Bz.reported[lang]}</Pill>
                        <span className="text-[14px] text-ink-soft">{t.period}</span>
                      </div>
                      <p className="mt-1.5 break-words text-[14px] text-ink-soft">
                        {Bz.source[lang]}: {t.source}{" "}
                        <a href={t.source_url} target="_blank" rel="noreferrer" className="link">
                          {Bz.openSource[lang]}
                        </a>
                        {figureNote(t.note, lang) && ` · ${figureNote(t.note, lang)}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* honest note */}
              <section className="mt-6 border border-line bg-white px-5 py-5 sm:px-6">
                <h2 className="text-2xl sm:text-3xl">{Bz.honestTitle[lang]}</h2>
                <p className="mt-2 text-[18px] leading-snug">{Bz.honest[lang]}</p>
                {toVerify.length > 0 && (
                  <>
                    <p className="mt-4 text-[15px] text-ink-soft">{Bz.toVerifyList[lang]}</p>
                    <ul className="mt-1">
                      {toVerify.map((a) => (
                        <li key={a.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-warn-soft px-3 py-2.5">
                          <span className="text-[16px]">{assumptionName(a, lang)}</span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span dir="ltr" className="text-[16px]">
                              {assumptionValue(a, lang)}
                            </span>
                            <Pill tone={STATUS.TO_VERIFY.tone}>{Bz.toVerify[lang]}</Pill>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <ul className="mt-4 space-y-1.5 text-[15px] leading-snug">
                  {warningTexts(d.warnings, lang).map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              </section>
              <DemoTag lang={lang} />
            </>
          )}
        </div>
      </Band>
    </>
  );
}

const pick = (p: { farmers: number; qatra: number }) => ({ farmers: p.farmers, qatra: p.qatra });
