import { useEffect, useState, type FormEvent } from "react";
import { get } from "../../api/client";
import type { AllFarmsCompatibility, Batch, Farm } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Pill, Skeleton } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { useApi } from "../../hooks/useApi";
import { useLang } from "../../i18n";
import { COMPLIANCE } from "../batches/format";
import DayPicker from "./DayPicker";
import MyFarm from "./MyFarm";
import { T, type RuleInfo } from "./format";

interface Static {
  farms: Farm[];
  batches: Batch[];
  rules: Map<string, RuleInfo>;
}

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
const STORAGE_KEY = "qatra.farm";

/** Farm code from a personal link (#/compatibility?farm=A), else the one remembered on this device. */
function initialFarm(): string | null {
  const fromLink = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("farm");
  if (fromLink) return fromLink.trim().toUpperCase();
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(code: string | null) {
  try {
    if (code) window.localStorage.setItem(STORAGE_KEY, code);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* not critical */
  }
}

/**
 * "Is this water safe for your farm?" — one farm only. A farmer never sees other farms.
 * NOTE: the page still loads every farm's result from the API and keeps only one; real privacy
 * needs logins and a per-farm endpoint on the server (next version).
 */
export default function CompatibilityTab() {
  const { lang } = useLang();
  const [batchId, setBatchId] = useState<string | null>(null); // null = backend default (latest usable batch)
  const [farmCode, setFarmCode] = useState<string | null>(initialFarm);
  const [input, setInput] = useState("");
  const [notFound, setNotFound] = useState(false);

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
      setNotFound(true);
      setFarmCode(null);
      remember(null);
    }
  }, [farmCode, base.data, farm]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (!code) return;
    const exists = base.data?.farms.some((f) => f.id.toUpperCase() === code);
    if (base.data && !exists) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    setFarmCode(code);
    remember(code);
  };

  const change = () => {
    setFarmCode(null);
    setInput("");
    remember(null);
  };

  const shownBatch = batchId ?? compat.data?.batch_id ?? "";
  const batch = base.data?.batches.find((b) => b.id === shownBatch);
  const batchStatus = batch?.status ?? compat.data?.batch_status;
  const error = base.error ?? compat.error;

  return (
    <>
      <Band tone="olive" className="md:py-24">
        <Intro as="h1" size="xl" eyebrow={T.eyebrow[lang]} title={T.title[lang]}>
          <p>{T.lead[lang]}</p>
        </Intro>

        {!farm ? (
          <form onSubmit={submit} className="fade-up mx-auto mt-10 flex max-w-md flex-col items-center gap-3">
            <label htmlFor="farm-code" className="text-[17px]">
              {T.codeLabel[lang]}
            </label>
            <div className="flex w-full gap-2">
              <input
                id="farm-code"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setNotFound(false);
                }}
                autoComplete="off"
                inputMode="text"
                maxLength={12}
                className="min-w-0 flex-1 border border-ink bg-cream px-4 py-3 text-center text-[20px] uppercase tracking-widest focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                aria-invalid={notFound}
                aria-describedby="farm-code-hint"
              />
              <button type="submit" className="btn min-w-0 bg-ink text-cream">
                {T.see[lang]}
              </button>
            </div>
            <p id="farm-code-hint" className={`text-[15px] ${notFound ? "font-medium text-bad" : ""}`}>
              {notFound ? T.notFound[lang] : T.codeHint[lang]}
            </p>
          </form>
        ) : (
          <div className="fade-up mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4">
            {base.data ? (
              <DayPicker batches={base.data.batches} value={shownBatch} onChange={setBatchId} lang={lang} />
            ) : (
              <Skeleton className="h-12 w-72" />
            )}
            <div className="flex items-center gap-3 text-[16px]">
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
          {USE_MOCKS && <p className="mb-6 text-center text-[15px]">{T.mockNote[lang]}</p>}
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
