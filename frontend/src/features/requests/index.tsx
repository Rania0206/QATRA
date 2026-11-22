import { useEffect, useState } from "react";
import { get, patch, post } from "../../api/client";
import type { AllFarmsCompatibility, Farm, RequestIn, RequestStatus, WaterRequest } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Pill, Segmented, Skeleton, type Tone } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { useApi } from "../../hooks/useApi";
import { useRole } from "../../hooks/useHashRole";
import { fmtDateL, useLang } from "../../i18n";
import { requestPowers } from "../../roles";
import RequestDrawer from "./RequestDrawer";
import RequestForm from "./RequestForm";
import { RQ } from "./texts";

type Filter = "all" | RequestStatus;
const TONE: Record<RequestStatus, Tone> = { pending: "neutral", approved: "ok", rejected: "bad" };

export default function RequestsTab() {
  const { lang } = useLang();
  const role = useRole();
  const power = requestPowers(role); // who may send, who may decide
  const farms = useApi<Farm[]>(() => get<Farm[]>("/api/farms"));
  const list = useApi<WaterRequest[]>(() => get<WaterRequest[]>("/api/requests"));
  // only for the "check against the rules" box of the form: if it is missing the form still works
  const compat = useApi<AllFarmsCompatibility | null>(() => get<AllFarmsCompatibility>("/api/compatibility").catch(() => null));
  // The list as this screen knows it. With the mock API the answers never change, so the screen applies them itself.
  const [items, setItems] = useState<WaterRequest[]>([]);
  useEffect(() => {
    if (list.data) setItems(list.data);
  }, [list.data]);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const [openId, setOpenId] = useState<string | null>(null);

  const shown = items.filter((r) => filter === "all" || r.status === filter);
  const opened = items.find((r) => r.id === openId) ?? null; // read from the list, so the drawer shows the new status after a decision

  const create = async (body: RequestIn): Promise<WaterRequest> => {
    const created = await post<WaterRequest>("/api/requests", body);
    const next: WaterRequest = USE_MOCKS
      ? {
          ...created,
          ...body,
          id: `REQ-${String(items.length + 1).padStart(3, "0")}`,
          status: "pending",
          created_at: new Date().toISOString(),
          crop: farms.data?.find((f) => f.id === body.farm_id)?.crop,
        }
      : created;
    setItems((s) => [...s, next]);
    if (!USE_MOCKS) list.reload();
    return next;
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

  // Lab and Public do not use requests: no form, no list (the list has the farms' volumes)
  if (!power.send && !power.decide)
    return (
      <>
        <Band tone="olive">
          <Intro as="h1" size="xl" eyebrow={RQ.eyebrow[lang]} title={RQ.title[lang]}>
            <p>{RQ.lead[lang]}</p>
          </Intro>
        </Band>
        <Band tone="cream">
          <p className="text-center text-[length:calc(17px*var(--fs))]">{RQ.noteNone[lang]}</p>
        </Band>
      </>
    );

  const note = role === null ? RQ.noteBoth[lang] : power.send ? RQ.noteSend[lang] : RQ.noteDecide[lang];

  return (
    <>
      <Band tone="olive">
        <Intro as="h1" size="xl" eyebrow={RQ.eyebrow[lang]} title={RQ.title[lang]}>
          <p>{RQ.lead[lang]}</p>
        </Intro>
      </Band>

      <Band tone="cream" wide>
        <div className="space-y-12">
          {power.send &&
            (farms.data ? <RequestForm lang={lang} farms={farms.data} compat={compat.data ?? null} onCreate={create} /> : <Skeleton className="mx-auto h-96 max-w-3xl" />)}

          <section aria-label={RQ.listTitle[lang]} className="space-y-4">
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
            <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">{note}</p>
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
              <div className="overflow-x-auto border border-line bg-white">
                <table className="w-full text-[length:calc(16px*var(--fs))]">
                  <thead>
                    <tr className="border-b border-ink text-start text-[length:calc(14px*var(--fs))] uppercase tracking-wide text-ink-soft">
                      <th className="px-3 py-2 text-start font-normal">{RQ.colId[lang]}</th>
                      <th className="px-3 py-2 text-start font-normal">{RQ.colFarm[lang]}</th>
                      <th className="px-3 py-2 text-end font-normal">{RQ.colVolume[lang]}</th>
                      <th className="px-3 py-2 text-start font-normal">{RQ.colDate[lang]}</th>
                      <th className="px-3 py-2 text-start font-normal">{RQ.colStatus[lang]}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-sand/50" data-status={r.status}>
                        <td className="px-3 py-3" dir="ltr">
                          <button type="button" onClick={() => setOpenId(r.id)} aria-label={`${RQ.openRequest[lang]} ${r.id}`} className="link">
                            {r.id}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          {r.farm_id}
                          {r.applicant_name && <span className="block text-[length:calc(14px*var(--fs))] text-ink-soft">{r.applicant_name}</span>}
                        </td>
                        <td className="px-3 py-3 text-end tabular-nums" dir="ltr">
                          {r.requested_m3.toLocaleString("en-US")}
                        </td>
                        <td className="px-3 py-3">
                          {fmtDateL(r.date, lang)}
                          {r.date_end && r.date_end !== r.date && <span className="block text-[length:calc(14px*var(--fs))] text-ink-soft">→ {fmtDateL(r.date_end, lang)}</span>}
                        </td>
                        <td className="px-3 py-3">
                          <Pill tone={TONE[r.status]}>{label(r.status)}</Pill>
                        </td>
                        <td className="px-3 py-3 text-end text-ink-soft" aria-hidden="true">
                          {lang === "ar" ? "‹" : "›"}
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

      {opened && (
        <RequestDrawer
          request={opened}
          lang={lang}
          canDecide={power.decide}
          busy={busy !== null}
          onDecide={(status) => decide(opened, status)}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
