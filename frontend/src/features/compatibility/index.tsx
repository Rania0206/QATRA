import { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "../../api/client";
import type { AllFarmsCompatibility, Batch, Decision, Farm } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Dot, Intro, Pill, Segmented, Skeleton } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { useApi } from "../../hooks/useApi";
import { COMPLIANCE, fmtDate } from "../batches/format";
import FarmCard, { FarmCardSkeleton } from "./FarmCard";
import FarmDrawer from "./FarmDrawer";
import { BATCH_STATUS, DECISION, T, isRtl, type Lang, type RuleInfo } from "./format";

interface Static {
  farms: Farm[];
  batches: Batch[];
  rules: Map<string, RuleInfo>;
}

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
const ORDER: Decision[] = ["compatible", "conditional", "blocked"];

export default function CompatibilityTab() {
  const [lang, setLang] = useState<Lang>("en");
  const [batchId, setBatchId] = useState<string | null>(null); // null = backend default (latest usable batch)
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);

  const base = useApi<Static>(async () => {
    const [farms, batches, rules] = await Promise.all([
      get<Farm[]>("/api/farms"),
      get<Batch[]>("/api/batches"),
      get<RuleInfo[]>("/api/rules"),
    ]);
    return { farms, batches: [...batches].sort(newestFirst), rules: new Map(rules.map((r) => [r.rule_id, r])) };
  });

  const compat = useApi<AllFarmsCompatibility>(() =>
    get(batchId ? `/api/compatibility?batch_id=${encodeURIComponent(batchId)}` : "/api/compatibility"),
  );
  const { reload: reloadCompat } = compat;
  useEffect(() => {
    if (batchId !== null) reloadCompat();
  }, [batchId, reloadCompat]);

  const close = useCallback(() => setSelectedFarm(null), []);
  const shownBatch = batchId ?? compat.data?.batch_id ?? "";
  const batch = base.data?.batches.find((b) => b.id === shownBatch);
  const batchStatus = batch?.status ?? compat.data?.batch_status;
  const byFarm = useMemo(() => new Map((compat.data?.items ?? []).map((i) => [i.farm_id, i])), [compat.data]);
  const counts = useMemo(() => {
    const c: Record<Decision, number> = { compatible: 0, conditional: 0, blocked: 0 };
    for (const i of compat.data?.items ?? []) c[i.decision] += 1;
    return c;
  }, [compat.data]);

  const error = base.error ?? compat.error;
  const loading = base.loading || compat.loading || !base.data || !compat.data;
  const farm = base.data?.farms.find((f) => f.id === selectedFarm);
  const farmResult = selectedFarm ? byFarm.get(selectedFarm) : undefined;

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} lang={lang}>
      {/* Hero: the question, the batch picker, the language */}
      <Band tone="olive" className="md:py-28">
        <Intro as="h1" size="xl" eyebrow={T.eyebrow[lang]} title={T.title[lang]}>
          <p>{T.lead[lang]}</p>
          {compat.data && !compat.loading && (
            <p className="mt-6 font-display text-[26px] leading-snug">
              {ORDER.map((d, i) => (
                <span key={d}>
                  {i > 0 && <span className="mx-2">·</span>}
                  <span className="whitespace-nowrap">
                    {counts[d]} {i === 0 ? `${T.farms[lang]} ` : ""}
                    {DECISION[d].legend[lang]}
                  </span>
                </span>
              ))}
            </p>
          )}
        </Intro>

        <div className="fade-up mx-auto mt-10 flex max-w-2xl flex-col items-center gap-5">
          <div className="flex w-full flex-wrap items-center justify-center gap-3">
            <label htmlFor="batch" className="eyebrow">
              {T.batch[lang]}
            </label>
            <select
              id="batch"
              value={shownBatch}
              disabled={!base.data}
              onChange={(e) => setBatchId(e.target.value)}
              className="min-w-0 flex-1 border border-ink bg-transparent px-4 py-3 text-[16px] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:max-w-sm"
            >
              {!shownBatch && <option value="">…</option>}
              {base.data?.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} · {fmtDate(b.date)} · {BATCH_STATUS[b.status]?.[lang] ?? b.status}
                </option>
              ))}
            </select>
            {batchStatus ? (
              <Pill tone={COMPLIANCE[batchStatus]?.tone ?? "neutral"} large>
                {BATCH_STATUS[batchStatus]?.[lang] ?? batchStatus}
              </Pill>
            ) : (
              <Skeleton className="h-10 w-36" />
            )}
          </div>
          <Segmented
            label="Language"
            value={lang}
            onChange={setLang}
            options={[
              { id: "en", label: "English" },
              { id: "fr", label: "Français" },
              { id: "ar", label: "العربية" },
            ]}
          />
        </div>
      </Band>

      {/* Farms */}
      <Band tone="cream" wide>
        <Intro eyebrow={T.farmsEyebrow[lang]} title={T.farmsTitle[lang]}>
          <p className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {ORDER.map((d) => (
              <span key={d} className="inline-flex items-center gap-2">
                <Dot tone={DECISION[d].tone} />
                {DECISION[d][lang]}
                {compat.data && !compat.loading && <span className="">({counts[d]})</span>}
              </span>
            ))}
          </p>
          {USE_MOCKS && <p className="mt-4 text-[15px]">{T.mockNote[lang]}</p>}
        </Intro>

        <div className="mt-16">
          {error ? (
            <ErrorBox
              error={error}
              onRetry={() => {
                base.reload();
                compat.reload();
              }}
            />
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }, (_, i) => (
                <FarmCardSkeleton key={i} />
              ))}
            </div>
          ) : base.data!.farms.length === 0 ? (
            <p className="text-center font-display text-3xl">{T.noFarms[lang]}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {base.data!.farms.map((f) => {
                const r = byFarm.get(f.id);
                return r ? (
                  <FarmCard
                    key={f.id}
                    farm={f}
                    result={r}
                    lang={lang}
                    selected={selectedFarm === f.id}
                    onSelect={() => setSelectedFarm(f.id)}
                  />
                ) : null;
              })}
            </div>
          )}
        </div>
      </Band>

      {farm && farmResult && base.data && (
        <FarmDrawer farm={farm} result={farmResult} rules={base.data.rules} lang={lang} onClose={close} />
      )}
    </div>
  );
}
