import { useEffect, useState } from "react";
import { get } from "../../api/client";
import type { AllFarmsCompatibility, Batch, Farm } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import FarmCodeForm from "../../components/FarmCodeForm";
import { getFarmCode, saveFarmCode } from "../../farm";
import { Band, Intro, Pill, Skeleton } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { useApi } from "../../hooks/useApi";
import { useLang } from "../../i18n";
import { COMPLIANCE } from "../batches/format";
import DayPicker from "./DayPicker";
import MyFarm from "./MyFarm";
import OperatorView, { useOperatorView } from "./OperatorView";
import { T, type RuleInfo } from "./format";

interface Static {
  farms: Farm[];
  batches: Batch[];
  rules: Map<string, RuleInfo>;
}

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
/**
 * "Is this water safe for your farm?" — one farm only. A farmer never sees other farms.
 * NOTE: the page still loads every farm's result from the API and keeps only one; real privacy
 * needs logins and a per-farm endpoint on the server (next version).
 */
function FarmerCompatibility() {
  const { lang } = useLang();
  const [batchId, setBatchId] = useState<string | null>(null); // null = backend default (latest usable batch)
  const [farmCode, setFarmCode] = useState<string | null>(getFarmCode);
  const [badCode, setBadCode] = useState(false); // a saved or linked code that does not exist

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

  const farm = farmCode ? base.data?.farms.find((f) => f.id.toUpperCase() === farmCode) : undefined;
  const result = farm ? compat.data?.items.find((i) => i.farm_id === farm.id) : undefined;

  // a remembered or linked code that does not exist: ask again
  useEffect(() => {
    if (farmCode && base.data && !farm) {
      setBadCode(true);
      setFarmCode(null);
      saveFarmCode(null);
    }
  }, [farmCode, base.data, farm]);

  const choose = (code: string) => {
    setBadCode(false);
    setFarmCode(code);
    saveFarmCode(code);
  };

  const change = () => {
    setFarmCode(null);
    saveFarmCode(null);
  };

  const shownBatch = batchId ?? compat.data?.batch_id ?? "";
  const batch = base.data?.batches.find((b) => b.id === shownBatch);
  const batchStatus = batch?.status ?? compat.data?.batch_status;
  const error = base.error ?? compat.error;

  return (
    <>
      <Band tone="olive">
        <Intro as="h1" size="xl" eyebrow={T.eyebrow[lang]} title={T.title[lang]}>
          <p>{T.lead[lang]}</p>
        </Intro>

        {!farmCode ? (
          <FarmCodeForm onSubmit={choose} notFound={badCode} />
        ) : (
          <div className="fade-up mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4">
            {base.data ? (
              <DayPicker batches={base.data.batches} value={shownBatch} onChange={setBatchId} lang={lang} />
            ) : (
              <Skeleton className="h-12 w-72" />
            )}
            <div className="flex items-center gap-3 text-[length:calc(16px*var(--fs))]">
              {T.quality[lang]}:
              {batchStatus ? (
                <Pill tone={COMPLIANCE[batchStatus]?.tone ?? "neutral"}>{COMPLIANCE[batchStatus]?.label[lang] ?? batchStatus}</Pill>
              ) : (
                <Skeleton className="h-8 w-32" />
              )}
            </div>
          </div>
        )}
      </Band>

      {farmCode && (
        <Band tone="cream">
          {USE_MOCKS && <p className="mb-6 text-center text-[length:calc(15px*var(--fs))]">{T.mockNote[lang]}</p>}
          {error ? (
            <ErrorBox
              error={error}
              onRetry={() => {
                base.reload();
                compat.reload();
              }}
            />
          ) : !farm || !result || compat.loading ? (
            <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <MyFarm farm={farm} result={result} rules={base.data!.rules} lang={lang} onChange={change} />
          )}
        </Band>
      )}
    </>
  );
}

/** Farmers get their own farm only. The all-farms operator view is a hidden demo mode (see OperatorView.tsx). */
export default function CompatibilityTab() {
  return useOperatorView() ? <OperatorView /> : <FarmerCompatibility />;
}
