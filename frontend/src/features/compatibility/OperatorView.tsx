import { useEffect, useMemo, useState } from "react";
import { get } from "../../api/client";
import type { AllFarmsCompatibility, Batch, Decision, Farm } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Drawer, Intro, Pill, Skeleton } from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useLang } from "../../i18n";
import { useRole } from "../../hooks/useHashRole";
import { OPERATOR_ROLES } from "../../roles";
import { COMPLIANCE } from "../batches/format";
import DayPicker from "./DayPicker";
import FarmCard, { FarmCardSkeleton } from "./FarmCard";
import MyFarm from "./MyFarm";
import { DECISION, T, type RuleInfo } from "./format";

/*
 * DEMO ONLY. Operator view: every farm against one batch (the old grid), for the plant manager / CRDA.
 * It is NOT access control: it is hidden by default and turns on with #/compatibility?view=operator
 * (or VITE_DEMO_OPERATOR=true in the build). A real version needs logins and a server-side role check.
 */
const param = (name: string) => new URLSearchParams(window.location.hash.split("?")[1] ?? "").get(name);
// ?view=operator / ?view=farmer win; else the demo role decides (ONAS and CRDA see all farms); else the build flag.
const isOperator = (role: string | null) => {
  const view = param("view");
  if (view === "operator") return true;
  if (view === "farmer") return false;
  if (role && OPERATOR_ROLES.includes(role)) return true;
  return import.meta.env.VITE_DEMO_OPERATOR === "true";
};

export function useOperatorView(): boolean {
  const role = useRole();
  const [, setTick] = useState(0); // re-render when the link changes (?view=)
  useEffect(() => {
    const update = () => setTick((n) => n + 1);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return isOperator(role);
}

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
const ORDER: Decision[] = ["compatible", "conditional", "blocked"];

export default function OperatorView() {
  const { lang } = useLang();
  const [batchId, setBatchId] = useState<string | null>(null); // null = backend default (latest usable batch)
  const [selected, setSelected] = useState<string | null>(null);

  const base = useApi(async () => {
    const [farms, batches, rules] = await Promise.all([
      get<Farm[]>("/api/farms"),
      get<Batch[]>("/api/batches"),
      get<RuleInfo[]>("/api/rules"),
    ]);
    return { farms, batches: [...batches].sort(newestFirst), rules: new Map(rules.map((r) => [r.rule_id, r])) };
  });
  const compat = useApi<AllFarmsCompatibility>(
    () => get(batchId ? `/api/compatibility?batch_id=${encodeURIComponent(batchId)}` : "/api/compatibility"),
    [batchId],
  );

  const byFarm = useMemo(() => new Map((compat.data?.items ?? []).map((i) => [i.farm_id, i])), [compat.data]);
  const counts = useMemo(() => {
    const c: Record<Decision, number> = { compatible: 0, conditional: 0, blocked: 0 };
    for (const i of compat.data?.items ?? []) c[i.decision] += 1;
    return c;
  }, [compat.data]);

  const shownBatch = batchId ?? compat.data?.batch_id ?? "";
  const status = base.data?.batches.find((b) => b.id === shownBatch)?.status ?? compat.data?.batch_status;
  const error = base.error ?? compat.error;
  const loading = base.loading || compat.loading || !base.data || !compat.data;
  const farm = base.data?.farms.find((f) => f.id === selected);
  const result = selected ? byFarm.get(selected) : undefined;

  return (
    <>
      <Band tone="olive">
        <p role="note" className="mx-auto mb-8 max-w-2xl border-2 border-ink px-4 py-2 text-center text-[length:calc(15px*var(--fs))] font-medium">
          {T.opBanner[lang]}
        </p>
        <Intro as="h1" size="xl" eyebrow={T.eyebrow[lang]} title={T.opTitle[lang]}>
          <p>{T.opLead[lang]}</p>
          {compat.data && !compat.loading && (
            <p className="mt-6 font-display text-[length:calc(26px*var(--fs)*var(--fsn))] leading-snug">
              {ORDER.map((d, i) => (
                <span key={d}>
                  {i > 0 && (
                    <>
                      <span className="mx-2">·</span>
                      <wbr /> {/* a place to break the line on a phone */}
                    </>
                  )}
                  <span className="whitespace-nowrap">
                    {counts[d]} {i === 0 ? `${T.farms[lang]} ` : ""}
                    {DECISION[d].legend[lang]}
                  </span>
                </span>
              ))}
            </p>
          )}
        </Intro>
        <div className="fade-up mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4">
          {base.data ? <DayPicker batches={base.data.batches} value={shownBatch} onChange={setBatchId} lang={lang} /> : <Skeleton className="h-12 w-72" />}
          {status && <Pill tone={COMPLIANCE[status]?.tone ?? "neutral"}>{COMPLIANCE[status]?.label[lang] ?? status}</Pill>}
          <a href="#/compatibility?view=farmer" className="link text-[length:calc(15px*var(--fs))]">
            {T.opBack[lang]}
          </a>
        </div>
      </Band>

      <Band tone="cream" wide>
        {error ? (
          <ErrorBox error={error} onRetry={() => { base.reload(); compat.reload(); }} />
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => <FarmCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {base.data!.farms.map((f) => {
              const r = byFarm.get(f.id);
              return r ? <FarmCard key={f.id} farm={f} result={r} lang={lang} selected={selected === f.id} onSelect={() => setSelected(f.id)} /> : null;
            })}
          </div>
        )}
      </Band>

      {farm && result && base.data && (
        <Drawer
          label={farm.name}
          onClose={() => setSelected(null)}
          header={
            <p className="eyebrow pe-14">
              {T.batch[lang]} <span dir="ltr">{result.batch_id}</span>
            </p>
          }
        >
          <MyFarm farm={farm} result={result} rules={base.data.rules} lang={lang} label={T.farm[lang]} />
        </Drawer>
      )}
    </>
  );
}
