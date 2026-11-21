import { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "../../api/client";
import type { AllFarmsCompatibility, Batch, Decision, Farm } from "../../api/types";
import TagChip from "../../components/TagChip";
import { USE_MOCKS } from "../../config";
import { useApi } from "../../hooks/useApi";
import ComplianceBadge from "../batches/ComplianceBadge";
import { COMPLIANCE_BADGE, fmtDate } from "../batches/format";
import { Screen, SectionTitle, Segmented, Skeleton } from "../batches/ui";
import FarmCard, { FarmCardSkeleton } from "./FarmCard";
import FarmDrawer from "./FarmDrawer";
import { DECISION, T, type Lang, type RuleInfo } from "./format";

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
    <Screen>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="q-label">{lang === "fr" ? "Compatibilité eau · ferme" : "Water × farm compatibility"}</p>
          <h2 className="q-display text-[28px] sm:text-4xl">{T.title[lang]}</h2>
        </div>
        <Segmented
          label="Language"
          value={lang}
          onChange={setLang}
          options={[
            { id: "en", label: "EN" },
            { id: "fr", label: "FR" },
          ]}
        />
      </header>

      <div className="q-card flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <label htmlFor="batch" className="q-label" style={{ color: "var(--q-ink)" }}>
          {T.batch[lang]}
        </label>
        <select
          id="batch"
          value={shownBatch}
          disabled={!base.data}
          onChange={(e) => setBatchId(e.target.value)}
          className="q-mono min-w-0 flex-1 rounded-[2px] border border-[var(--q-ink)] bg-[var(--q-paper)] px-3 py-2 text-base font-semibold transition-colors hover:bg-[var(--q-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--q-accent)] sm:flex-none"
        >
          {!shownBatch && <option value="">…</option>}
          {base.data?.batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id} · {fmtDate(b.date)} · {COMPLIANCE_BADGE[b.status]?.label ?? b.status}
            </option>
          ))}
        </select>
        {batchStatus ? <ComplianceBadge status={batchStatus} large /> : <Skeleton className="h-10 w-40" />}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {compat.data && <TagChip tag={compat.data.tag} showSource={false} />}
          {base.data?.farms[0] && <TagChip tag={base.data.farms[0].tag} />}
        </div>
      </div>

      {/* Legend + counts: readable in one glance on a projector */}
      <SectionTitle>
        <span className="flex flex-wrap items-center gap-x-6 gap-y-2 normal-case">
          {ORDER.map((d) => (
            <span key={d} className="inline-flex items-center gap-2">
              <span aria-hidden="true">{DECISION[d].icon}</span>
              <span className="q-title text-[20px]">{lang === "fr" ? DECISION[d].legendFr : DECISION[d].legendEn}</span>
              {compat.data && !compat.loading && (
                <span className="q-mono rounded-[2px] border border-[var(--q-ink)] px-2 text-lg font-semibold">{counts[d]}</span>
              )}
            </span>
          ))}
        </span>
      </SectionTitle>

      {USE_MOCKS && <p className="q-mono text-base">{T.mockNote[lang]}</p>}

      {error ? (
        <div role="alert" className="q-card space-y-3 border-[var(--q-bad)] p-5">
          <p className="q-title text-xl" style={{ color: "var(--q-bad)" }}>
            {lang === "fr" ? "Chargement impossible" : "Could not load compatibility"}
          </p>
          <p className="q-mono text-base">{error.message}</p>
          <button
            type="button"
            onClick={() => {
              base.reload();
              compat.reload();
            }}
            className="q-mono rounded-[2px] border border-[var(--q-ink)] bg-[var(--q-ink)] px-4 py-2 font-semibold uppercase text-[var(--q-paper)] transition-colors hover:bg-[var(--q-ink-2)]"
          >
            {lang === "fr" ? "Réessayer" : "Retry"}
          </button>
        </div>
      ) : loading ? (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <FarmCardSkeleton key={i} />
          ))}
        </div>
      ) : base.data!.farms.length === 0 ? (
        <div className="q-card border-dashed p-8 text-center text-lg">{lang === "fr" ? "Aucune ferme." : "No farms yet."}</div>
      ) : (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {farm && farmResult && base.data && (
        <FarmDrawer farm={farm} result={farmResult} rules={base.data.rules} lang={lang} onClose={close} />
      )}
    </Screen>
  );
}
