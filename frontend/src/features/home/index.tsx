import { useEffect, useRef, useState } from "react";
import { get } from "../../api/client";
import type { Batch } from "../../api/types";
import { Band, Skeleton } from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useLang, type Lang, type Tr } from "../../i18n";
import { fmtDate, fmtNumber } from "../batches/format";
import { CompliancePill } from "../batches/pills";
import { L, latestLine } from "./texts";

/*
 * Landing page: what QATRA does, told as the journey of one batch of water, from the plant to a field.
 * The journey is the one moving thing: each stop fills the line with water as it scrolls into view.
 * Colours and fonts are the platform's own (olive / khaki / cream, Fraunces + DM Sans); the only water colour is the
 * teal already used for "meets the law".
 */

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

/** Water-line edge between the olive hero and the cream page: two soft waves, no animation. */
function Waves() {
  return (
    <div className="bg-olive" aria-hidden="true">
      <svg viewBox="0 0 1440 96" preserveAspectRatio="none" className="block h-10 w-full md:h-16">
        <path d="M0 36 C180 6 360 6 540 32 S900 66 1080 36 S1320 8 1440 26 V96 H0Z" className="fill-olive-deep" />
        <path d="M0 62 C200 34 400 34 600 58 S1000 90 1200 62 S1380 42 1440 54 V96 H0Z" className="fill-cream" />
      </svg>
    </div>
  );
}

function LatestBatch() {
  const { lang } = useLang();
  const { data, loading } = useApi<Batch[]>(() => get<Batch[]>("/api/batches"), []);
  const latest = data ? [...data].sort(newestFirst)[0] : undefined;
  if (loading) return <Skeleton className="mx-auto mt-8 h-6 w-72" />;
  if (!latest) return null; // the page still reads fine without the live line
  return (
    <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[length:calc(16px*var(--fs))]">
      <span>{latestLine(fmtDate(latest.date, lang), fmtNumber(latest.volume_m3), lang)}</span>
      <CompliancePill status={latest.status} />
    </p>
  );
}

function Hero() {
  const { lang } = useLang();
  return (
    <>
      <section className="bg-olive px-5 pb-4 pt-14 text-center sm:px-8 md:pt-20">
        <div className="fade-up mx-auto max-w-3xl">
          <h1 className="text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.05]">{L.title[lang]}</h1>
          <p className="mx-auto mt-6 max-w-xl text-[length:calc(18px*var(--fs))] leading-relaxed">{L.lead[lang]}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <a href="#/compatibility" className="btn">
              {L.ctaFarm[lang]}
            </a>
            <a href="#/batches" className="btn">
              {L.ctaBatches[lang]}
            </a>
          </div>
          <LatestBatch />
        </div>
      </section>
      <Waves />
    </>
  );
}

/** A drop on the line: empty until the water reaches it, then filled. */
function Drop({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 30" width="24" height="30" aria-hidden="true" className="absolute start-0 top-1">
      <path
        d="M12 2.5C12 2.5 4.5 12 4.5 18.2a7.5 7.5 0 0 0 15 0C19.5 12 12 2.5 12 2.5Z"
        strokeWidth="1.5"
        className={`transition-[fill,stroke] duration-700 motion-reduce:transition-none ${on ? "fill-good stroke-good" : "fill-cream stroke-ink-soft"}`}
      />
    </svg>
  );
}

function Stop({ title, text, last, lang }: { title: Tr; text: Tr; last: boolean; lang: Lang }) {
  const ref = useRef<HTMLLIElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <li ref={ref} className={`relative ps-12 ${last ? "" : "pb-14"}`}>
      <Drop on={on} />
      {!last && (
        <>
          <span aria-hidden="true" className="absolute start-[11px] top-9 -bottom-1 w-px bg-line" />
          <span
            aria-hidden="true"
            className={`absolute start-[11px] top-9 -bottom-1 w-px origin-top bg-good transition-transform delay-200 duration-1000 ease-out motion-reduce:transition-none ${
              on ? "scale-y-100" : "scale-y-0"
            }`}
          />
        </>
      )}
      <h3 className="text-[length:calc(26px*var(--fs)*var(--fsn))] leading-tight">{title[lang]}</h3>
      <p className="mt-2 max-w-md text-[length:calc(17px*var(--fs))] leading-relaxed">{text[lang]}</p>
    </li>
  );
}

function Journey() {
  const { lang } = useLang();
  return (
    <section className="bg-cream px-5 py-20 sm:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-20">
        <div className="self-start md:sticky md:top-28">
          <h2 className="text-4xl sm:text-5xl">{L.journeyTitle[lang]}</h2>
          <p className="mt-5 max-w-sm text-[length:calc(18px*var(--fs))] leading-relaxed">{L.journeyLead[lang]}</p>
        </div>
        <ol>
          {L.stops.map((s, i) => (
            <Stop key={i} title={s.title} text={s.text} last={i === L.stops.length - 1} lang={lang} />
          ))}
        </ol>
      </div>
    </section>
  );
}

/** One thin wave line: the water motif, used once. */
function Ripple() {
  return (
    <svg viewBox="0 0 96 12" width="96" height="12" aria-hidden="true" className="mb-6 text-good">
      <path d="M0 6 Q12 -2 24 6 T48 6 T72 6 T96 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PowerCut() {
  const { lang } = useLang();
  return (
    <Band tone="khaki" wide>
      <div className="grid items-end gap-10 md:grid-cols-[1.3fr_1fr] md:gap-20">
        <div>
          <Ripple />
          <h2 className="text-4xl leading-[1.08] sm:text-5xl md:text-[3.5rem]">{L.cutTitle[lang]}</h2>
        </div>
        <div>
          <p className="text-[length:calc(18px*var(--fs))] leading-relaxed">{L.cutText[lang]}</p>
          <p className="mt-6">
            <a href="#/heatwave" className="link">
              {L.cutLink[lang]}
            </a>
          </p>
        </div>
      </div>
    </Band>
  );
}

function Who() {
  const { lang } = useLang();
  return (
    <Band tone="cream" wide>
      <h2 className="mb-12 text-4xl sm:text-5xl">{L.whoTitle[lang]}</h2>
      <div className="grid gap-12 md:grid-cols-3 md:gap-10">
        {L.who.map((w) => (
          <div key={w.tab} className="border-t border-ink pt-6">
            <h3 className="text-[length:calc(26px*var(--fs)*var(--fsn))] leading-tight">{w.title[lang]}</h3>
            <p className="mt-3 text-[length:calc(17px*var(--fs))] leading-relaxed">{w.text[lang]}</p>
            <p className="mt-5">
              <a href={`#/${w.tab}`} className="link">
                {w.link[lang]}
              </a>
            </p>
          </div>
        ))}
      </div>
    </Band>
  );
}

function Closing() {
  const { lang } = useLang();
  return (
    <Band tone="olive" className="text-center">
      <h2 className="text-4xl sm:text-5xl">{L.endTitle[lang]}</h2>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <a href="#/compatibility" className="btn">
          {L.ctaFarm[lang]}
        </a>
        <a href="#/public" className="btn">
          {L.ctaSources[lang]}
        </a>
      </div>
      <p className="mx-auto mt-8 max-w-md text-[length:calc(15px*var(--fs))] leading-snug">{L.endNote[lang]}</p>
    </Band>
  );
}

export default function HomeTab() {
  return (
    <>
      <Hero />
      <Journey />
      <PowerCut />
      <Who />
      <Closing />
    </>
  );
}
