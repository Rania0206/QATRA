import { useEffect, useState } from "react";
import { get, post } from "../../api/client";
import type { Allocation, AllocationItem, Farm } from "../../api/types";
import { Pill, type Tone } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { useApi } from "../../hooks/useApi";
import type { Lang } from "../../i18n";
import { cropName } from "../compatibility/format";
import { BK } from "./breakTexts";

/** The plan is run as if the batch held 250 m3: less than the farms' total need (about 390 m3), so the water a farm cannot take goes to the others. */
export const PLAN_BATCH = "SSUD-20260827";
export const PLAN_VOLUME = 250;
const MAX_ECE = 12;

const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TONE: Record<string, Tone> = { allocated: "ok", capped: "neutral", conditional: "warn", blocked: "bad" };

/*
 * DEMO ONLY (operator view, #/soil?view=operator): "break it". A judge raises a farm's soil salinity, the soil curves are
 * computed again and the allocator re-plans the batch in about a second. Not access control.
 */
export default function BreakIt({
  farmId, soilEce, farmEce, onEce, lang,
}: { farmId: string; soilEce: number | undefined; farmEce: number | null; onEce: (v: number | null) => void; lang: Lang }) {
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? soilEce ?? 0;

  // Debounce: a drag sends one request when the hand pauses, not one per pixel.
  useEffect(() => {
    if (draft === null) return;
    const t = window.setTimeout(() => onEce(draft), 250);
    return () => window.clearTimeout(t);
  }, [draft, onEce]);
  useEffect(() => setDraft(null), [farmId]);

  const farms = useApi<Farm[]>(() => get<Farm[]>("/api/farms"));
  const base = useApi<Allocation>(() => post<Allocation>("/api/allocate", { batch_id: PLAN_BATCH, volume_m3: PLAN_VOLUME }));
  const live = useApi<Allocation>(
    () => (farmEce === null ? Promise.resolve(null as unknown as Allocation) : post<Allocation>("/api/allocate", { batch_id: PLAN_BATCH, volume_m3: PLAN_VOLUME, soil_ece: { [farmId]: farmEce } })),
    [farmId, farmEce],
  );
  const now = farmEce === null ? base.data : live.data ?? base.data;
  const was = new Map((base.data?.items ?? []).map((i) => [i.farm_id, i.m3]));
  const crop = new Map((farms.data ?? []).map((f) => [f.id, f.crop]));
  const status = (i: AllocationItem): string =>
    i.status === "allocated" ? BK.stAllocated[lang] : i.status === "conditional" ? BK.stConditional[lang] : i.status === "blocked" ? BK.stBlocked[lang] : BK.stCapped[lang];

  return (
    <section className="mb-14 space-y-6 border border-ink p-6" aria-label={BK.title[lang]}>
      <div>
        <p className="eyebrow">{BK.eyebrow[lang]}</p>
        <h2 className="text-3xl">{BK.title[lang]}</h2>
        <p className="mt-2 max-w-3xl text-[17px] text-ink-soft">{BK.help[lang].replace("{farm}", farmId)}</p>
        {USE_MOCKS && <p className="mt-2 text-[15px] text-warn">{BK.mock[lang]}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-w-0 flex-1 items-center gap-4">
          <span className="w-72 shrink-0 font-medium">
            {BK.slider[lang].replace("{farm}", farmId)}: <span dir="ltr" className="tabular-nums">{fmt(value)} dS/m</span>
          </span>
          <input
            type="range"
            min={0}
            max={MAX_ECE}
            step={0.1}
            value={value}
            aria-label={BK.slider[lang].replace("{farm}", farmId)}
            onChange={(e) => setDraft(Number(e.target.value))}
            className="min-w-0 flex-1 accent-ink"
          />
        </label>
        <button
          type="button"
          disabled={farmEce === null && draft === null}
          onClick={() => { setDraft(null); onEce(null); }}
          className="border border-ink px-4 py-2 text-[16px] hover:bg-sand disabled:opacity-40"
        >
          {BK.reset[lang]}
        </button>
      </div>

      {now && (
        <div>
          <h3 className="border-b border-ink pb-2 text-2xl">{BK.planTitle[lang]}</h3>
          <p className="py-2 text-[15px] text-ink-soft">{BK.planHint[lang].replace("{batch}", PLAN_BATCH).replace("{m3}", String(PLAN_VOLUME))}</p>
          <table className="w-full text-[17px]">
            <thead>
              <tr className="border-b border-ink text-[14px] uppercase tracking-wide text-ink-soft">
                <th className="py-2 text-start font-normal">{BK.colFarm[lang]}</th>
                <th className="py-2 text-start font-normal">{BK.colStatus[lang]}</th>
                <th className="py-2 text-end font-normal">m³</th>
                <th className="py-2 text-end font-normal">{BK.colChange[lang]}</th>
              </tr>
            </thead>
            <tbody>
              {now.items.map((i) => {
                const d = Math.round((i.m3 - (was.get(i.farm_id) ?? i.m3)) * 10) / 10;
                return (
                  <tr key={i.farm_id} className={`border-b border-line ${i.farm_id === farmId ? "bg-sand" : ""}`} data-farm={i.farm_id}>
                    <td className="py-2">
                      {i.farm_id} <span className="text-[14px] text-ink-soft">{crop.has(i.farm_id) ? cropName(crop.get(i.farm_id)!, lang) : ""}</span>
                    </td>
                    <td className="py-2"><Pill tone={TONE[i.status] ?? "neutral"}>{status(i)}</Pill></td>
                    <td className="py-2 text-end tabular-nums" dir="ltr">{fmt(i.m3)}</td>
                    <td className="py-2 text-end tabular-nums" dir="ltr">
                      {d === 0 ? <span className="text-ink-soft">–</span> : <span className={d > 0 ? "text-ok" : "text-bad"}>{d > 0 ? "+" : "−"}{fmt(Math.abs(d))}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {now.items.find((i) => i.farm_id === farmId)?.cap_reason && (
            <p className="mt-3 text-[15px]">{farmId}: {now.items.find((i) => i.farm_id === farmId)?.cap_reason}</p>
          )}
        </div>
      )}
    </section>
  );
}
