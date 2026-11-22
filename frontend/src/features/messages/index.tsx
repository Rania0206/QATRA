import { useMemo, useState } from "react";
import { get, post } from "../../api/client";
import type { Farm, Message } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Segmented, Skeleton } from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useLang, type Lang } from "../../i18n";
import { cropName } from "../compatibility/format";
import { MS, stampOf } from "./texts";

type Show = "fr" | "ar" | "both";
const DEFAULT_FARM = "B"; // the farm of the example farmer

export default function MessagesTab() {
  const { lang } = useLang();
  const farms = useApi<Farm[]>(() => get<Farm[]>("/api/farms"));
  const msgs = useApi<Message[]>(() => get<Message[]>("/api/messages"));
  const [farmId, setFarmId] = useState(DEFAULT_FARM);
  const [show, setShow] = useState<Show>("both");
  // Replies sent from this screen. Kept here too so they show even when the answers are mocked.
  const [sent, setSent] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<Error | null>(null);

  const thread = useMemo(
    () => [...(msgs.data ?? []), ...sent].filter((m) => m.farm_id === farmId).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)),
    [msgs.data, sent, farmId],
  );
  const offer = [...thread].reverse().find((m) => m.direction === "out"); // the latest offer decides whether replying makes sense
  const canReply = !!offer && !!offer.status && offer.status !== "blocked";

  const reply = async (text: string) => {
    setSending(true);
    setSendError(null);
    try {
      await post<Message>("/api/messages/reply", { farm_id: farmId, text });
      setSent((s) => [...s, { id: `local-${s.length + 1}`, farm_id: farmId, direction: "in", channel: "sms", at: new Date().toISOString(), text }]);
    } catch (e) {
      setSendError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Band tone="olive" className="md:py-24">
        <Intro as="h1" size="xl" eyebrow={MS.eyebrow[lang]} title={MS.title[lang]}>
          <p>{MS.lead[lang]}</p>
        </Intro>
      </Band>

      <Band tone="cream" wide>
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <label className="flex items-center gap-3 text-[17px]">
              {MS.farm[lang]}
              <select
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                className="border border-ink bg-cream px-3 py-2 text-[17px] focus:outline-none focus-visible:outline-2 focus-visible:outline-ink"
              >
                {(farms.data ?? [{ id: DEFAULT_FARM, crop: "olive" } as Farm]).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} · {cropName(f.crop, lang)}
                  </option>
                ))}
              </select>
            </label>
            <Segmented<Show>
              label={MS.language[lang]}
              value={show}
              onChange={setShow}
              options={[
                { id: "fr", label: "FR" },
                { id: "ar", label: "AR" },
                { id: "both", label: MS.both[lang] },
              ]}
            />
          </div>

          <p role="note" className="mx-auto w-fit border border-warn px-5 py-2 text-center text-[18px] font-medium text-warn">
            {MS.mockup[lang]}
          </p>

          {msgs.loading ? (
            <div className="mx-auto max-w-[28rem] space-y-3" aria-busy="true" aria-label={MS.loading[lang]}>
              <Skeleton className="h-[34rem] w-full" />
            </div>
          ) : msgs.error ? (
            <ErrorBox error={msgs.error} onRetry={msgs.reload} />
          ) : (
            <PhoneFrame lang={lang}>
              <Chat thread={thread} show={show} lang={lang} />
              <ReplyBar canReply={canReply} sending={sending} onReply={reply} lang={lang} hasThread={thread.length > 0} />
            </PhoneFrame>
          )}

          {sendError && <ErrorBox error={`${MS.sendError[lang]} ${sendError.message}`} onRetry={() => setSendError(null)} />}

        </div>
      </Band>
    </>
  );
}

/** A rounded phone: notch, status bar, contact header, then the conversation. Always left-to-right: the Arabic text carries its own direction. */
function PhoneFrame({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <div dir="ltr" className="mx-auto w-full max-w-[28rem] rounded-[3rem] border-[12px] border-ink bg-ink shadow-2xl">
      <div className="relative overflow-hidden rounded-[2.1rem] bg-cream">
        <span aria-hidden="true" className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-ink" />
        <div aria-hidden="true" className="flex items-center justify-between bg-cream px-7 pb-1 pt-2 text-[13px] font-medium">
          <span>9:41</span>
          <span className="tracking-widest">▂▄▆ 5G ▭</span>
        </div>
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-olive font-display text-xl text-cream">
            ق
          </span>
          <div>
            <p className="text-[17px] font-medium leading-tight">{MS.contact[lang]}</p>
            <p className="text-[13px] text-ink-soft">SMS</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Chat({ thread, show, lang }: { thread: Message[]; show: Show; lang: Lang }) {
  return (
    <div className="h-[34rem] space-y-4 overflow-y-auto bg-sand px-3 py-4" role="log" aria-live="polite">
      {thread.length === 0 && <p className="mt-10 text-center text-[16px] text-ink-soft">{MS.empty[lang]}</p>}
      {thread.map((m) => (
        <Bubble key={m.id} m={m} show={show} lang={lang} />
      ))}
    </div>
  );
}

/** Outgoing (from QATRA) green on the right, incoming (the farmer) grey on the left. */
function Bubble({ m, show, lang }: { m: Message; show: Show; lang: Lang }) {
  const out = m.direction === "out";
  const wantAr = show !== "fr" && !!m.text_ar;
  const wantFr = show !== "ar" && !!m.text_fr;
  return (
    <div className={`flex flex-col ${out ? "items-end" : "items-start"}`}>
      <div className={`max-w-[88%] space-y-3 rounded-3xl px-4 py-3 text-[17px] leading-snug ${out ? "rounded-br-md bg-ok text-cream" : "rounded-bl-md bg-line text-ink"}`}>
        {out ? (
          <>
            {wantAr && (
              <p dir="rtl" lang="ar" className="text-right text-[19px] leading-relaxed">
                {m.text_ar}
              </p>
            )}
            {wantAr && wantFr && <hr aria-hidden="true" className="border-cream/40" />}
            {wantFr && (
              <p dir="ltr" lang="fr">
                {m.text_fr}
              </p>
            )}
            {wantAr && m.needs_human_review && <p className="text-[13px] opacity-80">⚠ {MS.review[lang]}</p>}
            {m.batch_id && m.status && m.status !== "blocked" && (
              <a href={`/passport/${encodeURIComponent(m.batch_id)}`} target="_blank" rel="noreferrer" className="block text-[16px] font-medium underline underline-offset-4">
                {MS.passport[lang]} →
              </a>
            )}
          </>
        ) : (
          <p dir="auto">{m.text}</p>
        )}
      </div>
      <time dateTime={m.at} className="mt-1 px-2 text-[13px] text-ink-soft">
        {stampOf(m.at, lang)}
      </time>
    </div>
  );
}

/** Quick replies. 3 and 4 will be added here once their meaning is defined. */
function ReplyBar({ canReply, sending, onReply, lang, hasThread }: { canReply: boolean; sending: boolean; onReply: (t: string) => void; lang: Lang; hasThread: boolean }) {
  return (
    <div className="border-t border-line bg-cream px-4 py-3">
      {canReply ? (
        <div className="space-y-2">
          <p className="text-[14px] text-ink-soft">{MS.replyHint[lang]}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { code: "1", label: MS.accept[lang] },
              { code: "2", label: MS.refuse[lang] },
            ].map((b) => (
              <button
                key={b.code}
                type="button"
                disabled={sending}
                onClick={() => onReply(b.code)}
                className="rounded-full border-2 border-ink px-4 py-3 text-[18px] font-medium transition-colors hover:bg-ink hover:text-cream focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
              >
                {b.code} · {b.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="py-2 text-center text-[15px] text-ink-soft">{hasThread ? MS.noReplyNeeded[lang] : ""}</p>
      )}
    </div>
  );
}
