import type { ReactNode } from "react";
import type { ApplicantCapacity, Declaration, IrrigationMethod, RequestStatus, WaterRequest } from "../../api/types";
import { Drawer, Pill, type Tone } from "../../components/ui";
import { fmtN } from "../../format";
import { fmtDateL, type Lang } from "../../i18n";
import { cropName } from "../compatibility/format";
import { FT } from "./formTexts";
import { RQ } from "./texts";

const TONE: Record<RequestStatus, Tone> = { pending: "neutral", approved: "ok", rejected: "bad" };
const CAPACITY: Record<ApplicantCapacity, keyof typeof FT> = { owner: "capOwner", tenant: "capTenant", gda_representative: "capGda" };
const METHOD: Record<IrrigationMethod, keyof typeof FT> = { drip: "mDrip", surface: "mSurface", sprinkler: "mSprinkler" };
const DECLARATIONS: Declaration[] = ["not_eaten_raw", "no_grazing", "crop_on_list", "water_limits", "accuracy"];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[length:calc(14px*var(--fs))] text-ink-soft">{label}</dt>
      <dd className="text-[length:calc(17px*var(--fs))]">{children}</dd>
    </div>
  );
}

/** Everything about one request, and (for ONAS / CRDA) the Approve and Reject buttons. */
export default function RequestDrawer({
  request: r,
  lang,
  canDecide,
  busy,
  onDecide,
  onClose,
}: {
  request: WaterRequest;
  lang: Lang;
  canDecide: boolean;
  busy: boolean;
  onDecide: (status: "approved" | "rejected") => void;
  onClose: () => void;
}) {
  const formal = !!r.applicant_name;
  const declared = DECLARATIONS.filter((d) => r.declarations?.includes(d));

  return (
    <Drawer
      label={`${RQ.detailsTitle[lang]} ${r.id}`}
      onClose={onClose}
      header={
        <div className="space-y-2 pe-16">
          <p className="text-[length:calc(14px*var(--fs))] uppercase tracking-wide text-ink-soft">{RQ.detailsTitle[lang]}</p>
          <h2 className="font-display text-3xl" dir="ltr">
            {r.id}
          </h2>
          <Pill tone={TONE[r.status]}>{RQ[r.status][lang]}</Pill>
        </div>
      }
    >
      <section className="space-y-3">
        <h3 className="text-[length:calc(20px*var(--fs))]">{FT.s3[lang]}</h3>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Row label={FT.volume[lang]}>
            <span dir="ltr" className="font-medium tabular-nums">
              {fmtN(r.requested_m3, lang)}
            </span>
          </Row>
          <Row label={r.date_end && r.date_end !== r.date ? FT.period[lang] : RQ.colDate[lang]}>
            {fmtDateL(r.date, lang)}
            {r.date_end && r.date_end !== r.date ? ` → ${fmtDateL(r.date_end, lang)}` : ""}
          </Row>
          <Row label={RQ.sentOn[lang]}>{fmtDateL(r.created_at.slice(0, 10), lang)}</Row>
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-[length:calc(20px*var(--fs))]">{FT.s2[lang]}</h3>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Row label={FT.farm[lang]}>{r.farm_id}</Row>
          {r.crop && <Row label={FT.crop[lang]}>{cropName(r.crop, lang)}</Row>}
          {r.area_ha != null && (
            <Row label={FT.area[lang]}>
              <span dir="ltr">{fmtN(r.area_ha, lang, 2)}</span> ha
            </Row>
          )}
          {r.irrigation_method && <Row label={FT.method[lang]}>{FT[METHOD[r.irrigation_method]][lang]}</Row>}
        </dl>
      </section>

      {formal ? (
        <>
          <section className="space-y-3">
            <h3 className="text-[length:calc(20px*var(--fs))]">{FT.s1[lang]}</h3>
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Row label={FT.fullName[lang]}>{r.applicant_name}</Row>
              {r.applicant_capacity && <Row label={FT.capacity[lang]}>{FT[CAPACITY[r.applicant_capacity]][lang]}</Row>}
              {r.applicant_phone && (
                <Row label={FT.phone[lang]}>
                  <span dir="ltr">{r.applicant_phone}</span>
                </Row>
              )}
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-[length:calc(20px*var(--fs))]">{FT.s4[lang]}</h3>
            <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">{FT.decIntro[lang]}</p>
            <ul className="space-y-2 text-[length:calc(16px*var(--fs))]">
              {declared.map((d) => (
                <li key={d} className="flex gap-3">
                  <span aria-hidden="true" className="text-ok">
                    ✓
                  </span>
                  <span>{FT[d][lang]}</span>
                </li>
              ))}
            </ul>
            {r.signed_name && (
              <p className="pt-2">
                <span className="block text-[length:calc(14px*var(--fs))] text-ink-soft">{FT.s5[lang]}</span>
                <span className="font-display text-[length:calc(22px*var(--fs))] italic">{r.signed_name}</span>
              </p>
            )}
          </section>
        </>
      ) : (
        <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">{RQ.shortRequest[lang]}</p>
      )}

      {r.status === "pending" && canDecide && (
        <section className="space-y-3 border-t border-line pt-6">
          <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">{RQ.finalNote[lang]}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => onDecide("approved")} className="btn disabled:opacity-50">
              {RQ.approve[lang]}
            </button>
            <button type="button" disabled={busy} onClick={() => onDecide("rejected")} className="border border-ink px-5 py-2 text-[length:calc(17px*var(--fs))] hover:bg-sand disabled:opacity-50">
              {RQ.reject[lang]}
            </button>
          </div>
        </section>
      )}
    </Drawer>
  );
}
