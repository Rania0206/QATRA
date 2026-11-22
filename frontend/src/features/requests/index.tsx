import { useEffect, useState, type FormEvent } from "react";
import { get, patch, post } from "../../api/client";
import type { Farm, RequestStatus, WaterRequest } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Pill, Segmented, Skeleton, type Tone } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { useApi } from "../../hooks/useApi";
import { fmtDateL, useLang } from "../../i18n";
import { cropName } from "../compatibility/format";
import { RQ } from "./texts";

type Filter = "all" | RequestStatus;
const TONE: Record<RequestStatus, Tone> = { pending: "neutral", approved: "ok", rejected: "bad" };

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function RequestsTab() {
  const { lang } = useLang();
  const farms = useApi<Farm[]>(() => get<Farm[]>("/api/farms"));
  const list = useApi<WaterRequest[]>(() => get<WaterRequest[]>("/api/requests"));
  // The list as this screen knows it. With the mock API the answers never change, so the screen applies them itself.
  const [items, setItems] = useState<WaterRequest[]>([]);
  useEffect(() => {
    if (list.data) setItems(list.data);
  }, [list.data]);

  const [farmId, setFarmId] = useState("");
  const [m3, setM3] = useState("");
  const [date, setDate] = useState(tomorrow);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const farm = farmId || farms.data?.[0]?.id || "";
  const shown = items.filter((r) => filter === "all" || r.status === filter);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const volume = Number(m3);
    if (!(volume > 0)) return setFormError(RQ.invalidVolume[lang]);
    if (!date) return setFormError(RQ.invalidDate[lang]);
    setFormError(null);
    setBusy("new");
    setError(null);
    try {
      const body = { farm_id: farm, requested_m3: volume, date };
      const created = await post<WaterRequest>("/api/requests", body);
      const next: WaterRequest = USE_MOCKS
        ? { ...created, ...body, id: `REQ-${String(items.length + 1).padStart(3, "0")}`, status: "pending", created_at: new Date().toISOString() }
        : created;
      setItems((s) => [...s, next]);
      setM3("");
      if (!USE_MOCKS) list.reload();
    } catch (err) {
      setError(err as Error);
    } finally {
      setBusy(null);
    }
  };

  const decide = async (r: WaterRequest, status: "approved" | "rejected") => {
    setBusy(r.id);
    setError(null);
    try {
      const done = await patch<WaterRequest>(`/api/requests/${r.id}`, { status });
      const next: WaterRequest = USE_MOCKS ? { ...r, status } : done;
      setItems((s) => s.map((x) => (x.id === r.id ? next : x)));
      if (!USE_MOCKS) list.reload();
    } catch (err) {
      setError(err as Error);
      list.reload(); // for example 409: somebody else decided first
    } finally {
      setBusy(null);
    }
  };

  const label = (s: RequestStatus) => RQ[s][lang];

  return (
    <>
      <Band tone="olive" className="md:py-28">
        <Intro as="h1" size="xl" eyebrow={RQ.eyebrow[lang]} title={RQ.title[lang]}>
          <p>{RQ.lead[lang]}</p>
        </Intro>
      </Band>

      <Band tone="cream" wide>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <form onSubmit={submit} className="min-w-0 space-y-5" aria-label={RQ.formTitle[lang]}>
            <h2 className="text-3xl">{RQ.formTitle[lang]}</h2>
            <label className="block text-[17px]">
              {RQ.farm[lang]}
              <select
                value={farm}
                onChange={(e) => setFarmId(e.target.value)}
                className="mt-1 block w-full border border-ink bg-cream px-3 py-2 text-[17px] focus:outline-none focus-visible:outline-2 focus-visible:outline-ink"
              >
                {(farms.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} · {cropName(f.crop, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[17px]">
              {RQ.volume[lang]}
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={m3}
                onChange={(e) => setM3(e.target.value)}
                className="mt-1 block w-full border border-ink bg-cream px-3 py-2 text-[17px] focus:outline-none focus-visible:outline-2 focus-visible:outline-ink"
              />
            </label>
            <label className="block text-[17px]">
              {RQ.date[lang]}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full border border-ink bg-cream px-3 py-2 text-[17px] focus:outline-none focus-visible:outline-2 focus-visible:outline-ink"
              />
            </label>
            {formError && (
              <p role="alert" className="text-bad">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={busy !== null || !farm}
              className="bg-ink px-6 py-3 text-[17px] text-cream disabled:opacity-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {busy === "new" ? RQ.sending[lang] : RQ.send[lang]}
            </button>
          </form>

          <section aria-label={RQ.listTitle[lang]} className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-3xl">{RQ.listTitle[lang]}</h2>
              <Segmented<Filter>
                label={RQ.filter[lang]}
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: RQ.all[lang] },
                  { id: "pending", label: RQ.pending[lang] },
                  { id: "approved", label: RQ.approved[lang] },
                  { id: "rejected", label: RQ.rejected[lang] },
                ]}
              />
            </div>
            <p className="text-[15px] text-ink-soft">{RQ.demo[lang]}</p>
            {list.error && <ErrorBox error={list.error} onRetry={list.reload} />}
            {error && (
              <p role="alert" className="text-bad">
                {RQ.actionError[lang]} {error.message}
              </p>
            )}
            {list.loading && !list.data ? (
              <Skeleton className="h-40 w-full" />
            ) : shown.length === 0 ? (
              <p className="py-8 text-ink-soft">{RQ.empty[lang]}</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-[17px]">
                <thead>
                  <tr className="border-b border-ink text-start text-[14px] uppercase tracking-wide text-ink-soft">
                    <th className="py-2 text-start font-normal">{RQ.colId[lang]}</th>
                    <th className="py-2 text-start font-normal">{RQ.colFarm[lang]}</th>
                    <th className="py-2 text-end font-normal">{RQ.colVolume[lang]}</th>
                    <th className="py-2 text-start font-normal ps-4">{RQ.colDate[lang]}</th>
                    <th className="py-2 text-start font-normal">{RQ.colStatus[lang]}</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className="border-b border-line" data-status={r.status}>
                      <td className="py-3" dir="ltr">{r.id}</td>
                      <td className="py-3">{r.farm_id}</td>
                      <td className="py-3 text-end tabular-nums" dir="ltr">{r.requested_m3.toLocaleString("en-US")}</td>
                      <td className="py-3 ps-4">{fmtDateL(r.date, lang)}</td>
                      <td className="py-3">
                        <Pill tone={TONE[r.status]}>{label(r.status)}</Pill>
                      </td>
                      <td className="py-3 text-end">
                        {r.status === "pending" && (
                          <span className="inline-flex gap-2">
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() => decide(r, "approved")}
                              className="border border-ink px-3 py-1 text-[16px] hover:bg-sand disabled:opacity-50"
                            >
                              {RQ.approve[lang]}
                            </button>
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() => decide(r, "rejected")}
                              className="border border-ink px-3 py-1 text-[16px] hover:bg-sand disabled:opacity-50"
                            >
                              {RQ.reject[lang]}
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>
        </div>
      </Band>
    </>
  );
}
