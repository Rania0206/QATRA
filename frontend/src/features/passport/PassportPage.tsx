import type { ReactNode } from "react";
import { get } from "../../api/client";
import type { Passport, PassportCheck, PassportQuality, RiskColour } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import TagChip from "../../components/TagChip";
import { useApi } from "../../hooks/useApi";
import { C, fmtDateL, useLang } from "../../i18n";

/** Batch id from /passport/{id}. */
export const passportIdFromPath = (path: string) => decodeURIComponent(path.replace(/^\/passport\//, "").split(/[/?#]/)[0]);

// Big status. Colour AND a symbol AND a word, so it reads without colour vision.
const STATUS: Record<RiskColour | "none", { bg: string; icon: string; word: string; line: string }> = {
  green: { bg: "bg-ok", icon: "✓", word: "GREEN", line: "Analyses valid and every NT 106.03 limit respected." },
  amber: { bg: "bg-warn", icon: "!", word: "AMBER", line: "Usable with conditions: read the points below." },
  red: { bg: "bg-bad", icon: "✕", word: "RED", line: "Do not use: an analysis is missing or expired, or a limit is exceeded." },
  none: { bg: "bg-ink-soft", icon: "?", word: "NOT RATED", line: "No colour could be given to this batch." },
};

const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 2 }));
const limitText = (q: PassportQuality) =>
  q.limit_min !== null && q.limit_max !== null ? `${q.limit_min}–${q.limit_max}` : q.limit_max !== null ? `≤ ${fmt(q.limit_max)}` : "–";

const CHECK_LABEL: Record<PassportCheck["type"], string> = {
  physico_chemical: "Physico-chemical",
  parasite_eggs: "Parasite eggs",
  metals: "Metals",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-6">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function QualityTable({ rows }: { rows: PassportQuality[] }) {
  return (
    <table className="w-full table-fixed text-[length:calc(15px*var(--fs))]">
      <thead>
        <tr className="border-b border-ink text-start text-[length:calc(13px*var(--fs))] uppercase tracking-wide text-ink-soft">
          <th className="w-[34%] py-1.5 text-start font-normal">Parameter</th>
          <th className="w-[22%] py-1.5 text-end font-normal">Value</th>
          <th className="w-[20%] py-1.5 text-end font-normal">Limit</th>
          <th className="w-[24%] py-1.5 text-end font-normal">Result</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((q) => {
          const notLaw = q.tag.status === "TO_VERIFY";
          return (
            <tr key={q.param} className="border-b border-line align-top last:border-0">
              <td className="py-2 pe-2">
                {q.label}
                {q.unit && <span className="block text-[length:calc(13px*var(--fs))] text-ink-soft">{q.unit}</span>}
                {notLaw && (
                  <span className="mt-1 block text-[length:calc(13px*var(--fs))] leading-snug text-ink-soft">
                    Not a legal limit: {q.legal_ref.replace("No limit in NT 106.03: ", "")}.
                    <span className="mt-1 block">
                      <TagChip tag={q.tag} showSource={false} />
                    </span>
                  </span>
                )}
              </td>
              <td className="py-2 text-end tabular-nums" dir="ltr">
                {q.value === null ? "–" : fmt(q.value)}
              </td>
              <td className="py-2 text-end tabular-nums text-ink-soft" dir="ltr">
                {limitText(q)}
              </td>
              <td className={`py-2 text-end font-medium ${q.ok === null ? "text-ink-soft" : q.ok ? "text-ok" : "text-bad"}`}>
                {q.ok === null ? "– n/a" : q.ok ? "✓ OK" : notLaw ? "✕ Above" : "✕ Not OK"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CheckRow({ c, lang }: { c: PassportCheck; lang: "en" | "fr" | "ar" }) {
  const state = c.is_valid === null ? { t: "Not required per batch", cls: "text-ink-soft" } : c.is_valid ? { t: "✓ Valid", cls: "text-ok" } : { t: c.present ? "✕ Expired" : "✕ Missing", cls: "text-bad" };
  return (
    <li className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0">
      <span>
        {CHECK_LABEL[c.type]}
        <span className="block text-[length:calc(13px*var(--fs))] text-ink-soft">
          {c.present && c.valid_until ? `Valid until ${fmtDateL(c.valid_until, lang)}` : `Every ${c.validity_days} days`} · {c.legal_ref}
        </span>
      </span>
      <span className={`shrink-0 font-medium ${state.cls}`}>{state.t}</span>
    </li>
  );
}

export default function PassportPage() {
  const { lang } = useLang();
  const id = passportIdFromPath(window.location.pathname);
  const { data: p, loading, error, reload } = useApi<Passport>(() => get<Passport>(`/api/batches/${encodeURIComponent(id)}/passport`), [id]);

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div role="note" className="bg-ink px-4 py-2 text-center text-[length:calc(13px*var(--fs))] leading-snug text-cream">
        {C.demo[lang]}
      </div>

      <main className="mx-auto w-full max-w-md space-y-6 px-4 py-6">
        {loading && <Loading />}
        {error && <ErrorBox error={/404/.test(error.message) ? `No passport for batch ${id}.` : error} onRetry={reload} />}

        {p && (
          <>
            <header className="space-y-2">
              <p className="eyebrow">Water passport</p>
              <h1 dir="ltr" className="break-all text-start text-4xl tabular-nums">
                {p.batch_id}
              </h1>
              <p className="text-[length:calc(16px*var(--fs))]">
                {fmtDateL(p.date, lang)} · {fmt(p.volume_m3)} m³
              </p>
              <p className="text-[length:calc(16px*var(--fs))] text-ink-soft">{p.plant}</p>
              {/TO_VERIFY/.test(p.plant) && (
                <p className="text-[length:calc(14px*var(--fs))] leading-snug text-warn">The plant identity is not confirmed (TO_VERIFY): it is assumed from the nearest mapped plant.</p>
              )}
            </header>

            {(() => {
              const s = STATUS[p.risk_colour ?? "none"];
              return (
                <div role="status" className={`${s.bg} space-y-1 px-4 py-5 text-cream`}>
                  <p className="flex items-center gap-3 font-display text-5xl leading-none">
                    <span aria-hidden="true">{s.icon}</span>
                    {s.word}
                  </p>
                  <p className="text-[length:calc(16px*var(--fs))] leading-snug">{s.line}</p>
                </div>
              );
            })()}

            <Section title="Water quality">
              <QualityTable rows={p.quality_summary} />
              <p className="text-[length:calc(13px*var(--fs))] text-ink-soft">Limits: NT 106.03 (1989). Values come from the laboratory analysis of this batch.</p>
            </Section>

            <Section title="Analyses">
              <ul className="space-y-2 text-[length:calc(15px*var(--fs))]">
                {p.checks.map((c) => (
                  <CheckRow key={c.type} c={c} lang={lang} />
                ))}
              </ul>
            </Section>

            <Section title="Crops">
              <div className="space-y-4">
                <div>
                  <h3 className="mb-1 text-xl text-ok">✓ Allowed</h3>
                  {p.allowed_crops.length ? (
                    <ul className="flex flex-wrap gap-2 text-[length:calc(15px*var(--fs))]">
                      {p.allowed_crops.map((c) => (
                        <li key={c} className="rounded-full bg-ok-soft px-3 py-0.5 text-ok">
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">None: this batch cannot be used.</p>
                  )}
                </div>
                <div>
                  <h3 className="mb-1 text-xl text-bad">✕ Not allowed</h3>
                  <ul className="flex flex-wrap gap-2 text-[length:calc(15px*var(--fs))]">
                    {p.blocked_crops.map((c) => (
                      <li key={c} className="rounded-full bg-bad-soft px-3 py-0.5 text-bad">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-[length:calc(13px*var(--fs))] text-ink-soft">Source: order of 21 June 1994 and Decree 89-1047. "(to verify)" means allowed by interpretation, not named in the list.</p>
              </div>
            </Section>

            <Section title="Deliveries">
              {p.destinations.length ? (
                <>
                  <ul className="text-[length:calc(16px*var(--fs))]">
                    {p.destinations.map((d) => (
                      <li key={d.farm_id} className="flex justify-between border-b border-line py-1.5">
                        <span>Farm {d.farm_id}</span>
                        <span className="tabular-nums">{fmt(d.m3)} m³</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-end text-[length:calc(15px*var(--fs))] text-ink-soft">Total {fmt(p.destinations.reduce((s, d) => s + d.m3, 0))} m³</p>
                </>
              ) : (
                <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">No delivery planned yet for this batch.</p>
              )}
            </Section>

            <Section title="Timeline">
              <ol className="space-y-3 border-s border-line ps-4">
                {p.timeline.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="relative">
                    <span aria-hidden="true" className="absolute -start-[21px] top-2 h-2.5 w-2.5 rounded-full bg-ink" />
                    <p className="text-[length:calc(13px*var(--fs))] text-ink-soft">{fmtDateL(e.at, lang)}</p>
                    <p className="text-[length:calc(15px*var(--fs))] leading-snug">{e.event}</p>
                  </li>
                ))}
              </ol>
            </Section>

            <footer className="space-y-2 border-t border-line pt-6 text-[length:calc(13px*var(--fs))] text-ink-soft">
              <TagChip tag={p.tag} />
              <p dir="ltr">Issued {p.issued_at.replace("T", " ").slice(0, 16)} · {p.qr_payload}</p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
