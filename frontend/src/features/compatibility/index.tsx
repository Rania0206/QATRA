import { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "../../api/client";
import type { AllFarmsCompatibility, Batch, Decision, Farm } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import TagChip from "../../components/TagChip";
import { USE_MOCKS } from "../../config";
import { useApi } from "../../hooks/useApi";
import ComplianceBadge from "../batches/ComplianceBadge";
import { COMPLIANCE_BADGE, fmtDate } from "../batches/format";
import DecisionBadge from "./DecisionBadge";
import FarmCard from "./FarmCard";
import FarmDrawer from "./FarmDrawer";
import { T, type Lang, type RuleInfo } from "./format";

interface Static {
  farms: Farm[];
  batches: Batch[];
  rules: Map<string, RuleInfo>;
}

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

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
  const byFarm = useMemo(() => new Map((compat.data?.items ?? []).map((i) => [i.farm_id, i])), [compat.data]);
  const counts = useMemo(() => {
    const c: Record<Decision, number> = { compatible: 0, conditional: 0, blocked: 0 };
    for (const i of compat.data?.items ?? []) c[i.decision] += 1;
    return c;
  }, [compat.data]);

  const error = base.error ?? compat.error;
  const farm = base.data?.farms.find((f) => f.id === selectedFarm);
  const farmResult = selectedFarm ? byFarm.get(selectedFarm) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">{T.title[lang]}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="batch" className="text-lg font-medium text-slate-700">
              {T.batch[lang]}
            </label>
            <select
              id="batch"
              value={shownBatch}
              disabled={!base.data}
              onChange={(e) => setBatchId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-base"
            >
              {!shownBatch && <option value="">…</option>}
              {base.data?.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} · {fmtDate(b.date)} · {COMPLIANCE_BADGE[b.status]?.label ?? b.status}
                </option>
              ))}
            </select>
            {(batch?.status ?? compat.data?.batch_status) && (
              <ComplianceBadge status={batch?.status ?? compat.data!.batch_status} large />
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex rounded-lg ring-1 ring-slate-300" role="group" aria-label="Language">
            {(["en", "fr"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`px-4 py-2 text-base font-semibold first:rounded-l-lg last:rounded-r-lg ${
                  lang === l ? "bg-teal-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {compat.data && <TagChip tag={compat.data.tag} showSource={false} />}
            {base.data?.farms[0] && <TagChip tag={base.data.farms[0].tag} />}
          </div>
        </div>
      </div>

      {USE_MOCKS && <p className="text-sm text-slate-500">{T.mockNote[lang]}</p>}

      {compat.data && !compat.loading && (
        <div className="flex flex-wrap gap-3 text-lg">
          {(Object.keys(counts) as Decision[]).map((d) => (
            <span key={d} className="inline-flex items-center gap-2">
              <DecisionBadge decision={d} lang={lang} /> <strong>{counts[d]}</strong>
            </span>
          ))}
        </div>
      )}

      {error ? (
        <ErrorBox
          error={error}
          onRetry={() => {
            base.reload();
            compat.reload();
          }}
        />
      ) : base.loading || compat.loading || !base.data || !compat.data ? (
        <Loading label={lang === "fr" ? "Chargement…" : "Loading compatibility…"} />
      ) : base.data.farms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-lg text-slate-500">
          {lang === "fr" ? "Aucune ferme." : "No farms yet."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {base.data.farms.map((f) => {
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
    </div>
  );
}
