import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type {
  AllFarmsCompatibility,
  ApplicantCapacity,
  Declaration,
  Farm,
  IrrigationMethod,
  RequestIn,
  WaterRequest,
} from "../../api/types";
import { Pill } from "../../components/ui";
import { fmtN } from "../../format";
import { fmtDateL, type Lang } from "../../i18n";
import { DECISION, cropName, mainReason } from "../compatibility/format";
import { FT } from "./formTexts";

const DECLARATIONS: Declaration[] = ["not_eaten_raw", "no_grazing", "crop_on_list", "water_limits", "accuracy"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};

const INPUT =
  "mt-1 block w-full border bg-cream px-3 py-2 text-[length:calc(17px*var(--fs))] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Field({ id, label, required, hint, error, children, lang }: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode; lang: Lang }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[length:calc(16px*var(--fs))] font-medium">
        {label}{" "}
        <span className="text-[length:calc(13px*var(--fs))] font-normal text-ink-soft">({required ? FT.required[lang] : FT.optional[lang]})</span>
      </label>
      {children}
      {hint && <p className="mt-1 text-[length:calc(14px*var(--fs))] text-ink-soft">{hint}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-[length:calc(14px*var(--fs))] font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-5 sm:px-7" aria-label={title}>
      <h3 className="flex items-baseline gap-3 font-display text-[length:calc(22px*var(--fs))] font-medium">
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink text-[length:calc(15px*var(--fs))]">
          {n}
        </span>
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

interface Props {
  lang: Lang;
  farms: Farm[];
  compat: AllFarmsCompatibility | null;
  /** Sends the request; resolves with the stored request (the page also adds it to its list). */
  onCreate: (body: RequestIn) => Promise<WaterRequest>;
}

/** A formal request for treated wastewater: applicant, farm, water, legal declarations, signature. */
export default function RequestForm({ lang, farms, compat, onCreate }: Props) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState<ApplicantCapacity>("owner");
  const [phone, setPhone] = useState("");
  const [farmId, setFarmId] = useState("");
  const [method, setMethod] = useState<IrrigationMethod>("drip");
  const [m3, setM3] = useState("");
  const [from, setFrom] = useState(() => inDays(1));
  const [until, setUntil] = useState(() => inDays(7));
  const [accepted, setAccepted] = useState<Record<Declaration, boolean>>({ not_eaten_raw: false, no_grazing: false, crop_on_list: false, water_limits: false, accuracy: false });
  const [signed, setSigned] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<WaterRequest | null>(null);

  const farm = farms.find((f) => f.id === (farmId || farms[0]?.id));
  const verdict = farm ? compat?.items.find((i) => i.farm_id === farm.id) : undefined;
  const blocked = verdict?.decision === "blocked";
  const sources = useMemo(() => ({ well: FT.srcWell[lang], borehole: FT.srcBorehole[lang], network: FT.srcNetwork[lang] }) as Record<string, string>, [lang]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = FT.errName[lang];
    if (!(Number(m3) > 0)) e.m3 = FT.errVolume[lang];
    if (!from || !until || until < from) e.dates = FT.errDates[lang];
    if (DECLARATIONS.some((d) => !accepted[d])) e.declarations = FT.errDeclarations[lang];
    if (!signed.trim()) e.signed = FT.errSign[lang];
    else if (signed.trim().toLowerCase() !== name.trim().toLowerCase()) e.signed = FT.errSignMatch[lang];
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!farm || blocked) return;
    const e = validate();
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body: RequestIn = {
        farm_id: farm.id,
        requested_m3: Number(m3),
        date: from,
        date_end: until,
        applicant_name: name.trim(),
        applicant_capacity: capacity,
        applicant_phone: phone.trim() || undefined,
        irrigation_method: method,
        declarations: DECLARATIONS,
        signed_name: signed.trim(),
      };
      setReceipt(await onCreate(body));
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    setReceipt(null);
    setM3("");
    setSigned("");
    setAccepted({ not_eaten_raw: false, no_grazing: false, crop_on_list: false, water_limits: false, accuracy: false });
    setErrors({});
  };

  const head = (
    <header className="border-b-2 border-ink px-5 py-5 sm:px-7">
      <p className="eyebrow">{FT.kind[lang]}</p>
      <h2 className="mt-1 font-display text-[length:calc(26px*var(--fs)*var(--fsn))] font-medium leading-tight">{FT.docTitle[lang]}</h2>
      <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-[length:calc(15px*var(--fs))] sm:grid-cols-2">
        <div>
          <dt className="text-ink-soft">{FT.to[lang]}</dt>
          <dd>{FT.toValue[lang]}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{FT.basis[lang]}</dt>
          <dd>{FT.basisValue[lang]}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{FT.dateOfRequest[lang]}</dt>
          <dd>{fmtDateL(iso(new Date()), lang)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{FT.reference[lang]}</dt>
          <dd>{receipt ? <span dir="ltr">{receipt.id}</span> : FT.referenceValue[lang]}</dd>
        </div>
      </dl>
    </header>
  );

  if (receipt)
    return (
      <div className="mx-auto w-full max-w-3xl border border-line bg-white" role="status">
        {head}
        <div className="px-5 py-6 sm:px-7">
          <h3 className="font-display text-[length:calc(24px*var(--fs))] font-medium text-ok">✓ {FT.receivedTitle[lang]}</h3>
          <p className="mt-1 text-[length:calc(17px*var(--fs))]">{FT.receivedLead[lang]}</p>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-[length:calc(16px*var(--fs))] sm:grid-cols-2">
            <div>
              <dt className="text-ink-soft">{FT.reference[lang]}</dt>
              <dd className="font-medium" dir="ltr">{receipt.id}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">{FT.applicant[lang]}</dt>
              <dd>{receipt.applicant_name ?? name}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">{FT.farm[lang]}</dt>
              <dd>{receipt.farm_id}{receipt.crop ? ` · ${cropName(receipt.crop, lang)}` : ""}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">{FT.volume[lang]}</dt>
              <dd dir="ltr">{fmtN(receipt.requested_m3, lang)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-soft">{FT.period[lang]}</dt>
              <dd>
                {fmtDateL(receipt.date, lang)}
                {receipt.date_end ? ` → ${fmtDateL(receipt.date_end, lang)}` : ""}
              </dd>
            </div>
          </dl>
          <button type="button" onClick={again} className="btn mt-5">
            {FT.another[lang]}
          </button>
        </div>
      </div>
    );

  const errorCount = Object.keys(errors).length;
  const bad = (k: string) => (errors[k] ? "border-bad" : "border-ink");

  return (
    <form onSubmit={submit} noValidate className="mx-auto w-full max-w-3xl border border-line bg-white" aria-label={FT.docTitle[lang]}>
      {head}

      <Section n={1} title={FT.s1[lang]}>
        <Field id="rq-name" label={FT.fullName[lang]} required error={errors.name} lang={lang}>
          <input id="rq-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} className={`${INPUT} ${bad("name")}`} maxLength={120} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="rq-capacity" label={FT.capacity[lang]} required lang={lang}>
            <select id="rq-capacity" value={capacity} onChange={(e) => setCapacity(e.target.value as ApplicantCapacity)} className={`${INPUT} border-ink`}>
              <option value="owner">{FT.capOwner[lang]}</option>
              <option value="tenant">{FT.capTenant[lang]}</option>
              <option value="gda_representative">{FT.capGda[lang]}</option>
            </select>
          </Field>
          <Field id="rq-phone" label={FT.phone[lang]} lang={lang}>
            <input id="rq-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" maxLength={30} className={`${INPUT} border-ink`} />
          </Field>
        </div>
      </Section>

      <Section n={2} title={FT.s2[lang]}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="rq-farm" label={FT.farm[lang]} required lang={lang}>
            <select id="rq-farm" value={farm?.id ?? ""} onChange={(e) => setFarmId(e.target.value)} className={`${INPUT} border-ink`}>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id} · {cropName(f.crop, lang)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="rq-method" label={FT.method[lang]} required hint={method === "sprinkler" ? FT.sprinklerHint[lang] : undefined} lang={lang}>
            <select id="rq-method" value={method} onChange={(e) => setMethod(e.target.value as IrrigationMethod)} className={`${INPUT} border-ink`}>
              <option value="drip">{FT.mDrip[lang]}</option>
              <option value="surface">{FT.mSurface[lang]}</option>
              <option value="sprinkler">{FT.mSprinkler[lang]}</option>
            </select>
          </Field>
        </div>
        {farm && (
          <dl className="grid gap-x-6 gap-y-1 bg-sand px-4 py-3 text-[length:calc(15px*var(--fs))] sm:grid-cols-3">
            <div>
              <dt className="text-ink-soft">{FT.crop[lang]}</dt>
              <dd className="font-medium">{cropName(farm.crop, lang)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">{FT.area[lang]}</dt>
              <dd className="font-medium"><span dir="ltr">{fmtN(farm.area_ha, lang, 2)}</span> ha</dd>
            </div>
            <div>
              <dt className="text-ink-soft">{FT.source[lang]}</dt>
              <dd className="font-medium">{sources[farm.fresh_source] ?? farm.fresh_source}</dd>
            </div>
          </dl>
        )}
        {farm && verdict && (
          <div className={`border-s-4 px-4 py-3 ${blocked ? "border-bad" : verdict.decision === "conditional" ? "border-warn" : "border-ok"} bg-cream`} aria-live="polite">
            <p className="flex flex-wrap items-center gap-2 text-[length:calc(15px*var(--fs))] text-ink-soft">
              {FT.precheck[lang]} <Pill tone={DECISION[verdict.decision].tone}>{DECISION[verdict.decision][lang]}</Pill>
            </p>
            <p className={`mt-1 text-[length:calc(16px*var(--fs))] ${blocked ? "font-medium text-bad" : ""}`}>
              {blocked ? `${mainReason(verdict.results, lang, farm.crop)} ${FT.precheckBlocked[lang]}` : verdict.decision === "conditional" ? FT.precheckCare[lang] : FT.precheckOk[lang]}
            </p>
          </div>
        )}
      </Section>

      <Section n={3} title={FT.s3[lang]}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="rq-m3" label={FT.volume[lang]} required error={errors.m3} lang={lang}>
            <input id="rq-m3" type="number" min="0" step="any" inputMode="decimal" dir="ltr" value={m3} onChange={(e) => setM3(e.target.value)} aria-invalid={!!errors.m3} className={`${INPUT} ${bad("m3")}`} />
          </Field>
          <Field id="rq-from" label={FT.from[lang]} required error={errors.dates} lang={lang}>
            <input id="rq-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={!!errors.dates} className={`${INPUT} ${bad("dates")}`} />
          </Field>
          <Field id="rq-until" label={FT.until[lang]} required lang={lang}>
            <input id="rq-until" type="date" value={until} min={from} onChange={(e) => setUntil(e.target.value)} aria-invalid={!!errors.dates} className={`${INPUT} ${bad("dates")}`} />
          </Field>
        </div>
        <p className="text-[length:calc(14px*var(--fs))] text-ink-soft">{FT.volumeNote[lang]}</p>
      </Section>

      <Section n={4} title={FT.s4[lang]}>
        <p className="text-[length:calc(16px*var(--fs))] font-medium">{FT.decIntro[lang]}</p>
        <ul className="space-y-3">
          {DECLARATIONS.map((d) => (
            <li key={d}>
              <label className="flex cursor-pointer items-start gap-3 text-[length:calc(16px*var(--fs))] leading-snug">
                <input
                  type="checkbox"
                  checked={accepted[d]}
                  onChange={(e) => setAccepted((s) => ({ ...s, [d]: e.target.checked }))}
                  className="mt-1 h-5 w-5 shrink-0 accent-ink"
                />
                <span>{FT[d][lang]}</span>
              </label>
            </li>
          ))}
        </ul>
        {errors.declarations && (
          <p role="alert" className="text-[length:calc(14px*var(--fs))] font-medium text-bad">
            {errors.declarations}
          </p>
        )}
      </Section>

      <Section n={5} title={FT.s5[lang]}>
        <Field id="rq-sign" label={FT.signedName[lang]} required error={errors.signed} hint={FT.signNote[lang]} lang={lang}>
          <input id="rq-sign" value={signed} onChange={(e) => setSigned(e.target.value)} aria-invalid={!!errors.signed} className={`${INPUT} ${bad("signed")} font-display text-[length:calc(20px*var(--fs))] italic`} maxLength={120} />
        </Field>
      </Section>

      <footer className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
        <div className="min-w-0 text-[length:calc(15px*var(--fs))]">
          {errorCount > 0 && <p role="alert" className="font-medium text-bad">{FT.fixErrors[lang]}</p>}
          {serverError && <p role="alert" className="text-bad">{serverError}</p>}
        </div>
        <button type="submit" disabled={busy || !farm || blocked} className="bg-ink px-6 py-3 text-[length:calc(17px*var(--fs))] text-cream focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? FT.submitting[lang] : FT.submit[lang]}
        </button>
      </footer>
    </form>
  );
}
