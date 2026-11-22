import { useState } from "react";
import { get } from "../../api/client";
import type { Tag } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import { Band, Intro } from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useLang } from "../../i18n";

// Local shape for the example (GET /api/impact); the shared contract is untouched.
interface Impact {
  period: string;
  tww_allocated_m3: number;
  fresh_water_saved_m3: number;
  tag: Tag;
}

const TX = {
  eyebrow: { en: "Impact", fr: "Impact", ar: "الأثر" },
  title: { en: "Fresh water left in the ground.", fr: "De l'eau douce laissée dans le sol.", ar: "مياه عذبة تبقى في باطن الأرض." },
  lead: {
    en: "Every cubic metre of treated water used on a field is a cubic metre not pumped from a well.",
    fr: "Chaque mètre cube d'eau traitée utilisé au champ est un mètre cube non pompé dans un puits.",
    ar: "كل متر مكعب من الماء المعالج يُستعمل في الحقل هو متر مكعب لا يُضخّ من البئر.",
  },
  saved: { en: "of fresh water saved", fr: "d'eau douce économisés", ar: "من المياه العذبة تمّ توفيرها" },
  simulate: { en: "Simulate a failing call", fr: "Simuler un appel en échec", ar: "محاكاة طلب فاشل" },
};

// Usage example of useApi + Loading + ErrorBox. B-xx replaces the body later.
export default function ImpactTab() {
  const { lang } = useLang();
  const [simulateFailure, setSimulateFailure] = useState(false);
  const { data, loading, error, reload } = useApi<Impact>(() =>
    simulateFailure ? Promise.reject(new Error("Simulated failure (demo)")) : get<Impact>("/api/impact"),
  );

  return (
    <>
      <Band tone="olive" className="md:py-32">
        <Intro as="h1" size="xl" eyebrow={TX.eyebrow[lang]} title={TX.title[lang]}>
          <p>{TX.lead[lang]}</p>
        </Intro>
      </Band>

      <Band tone="cream">
        {loading && <Loading />}
        {error && <ErrorBox error={error} onRetry={reload} />}
        {data && (
          <div className="fade-up flex flex-col items-center gap-5 text-center">
            <p className="eyebrow">{data.period}</p>
            <p dir="ltr" className="font-display text-7xl leading-none tabular-nums">
              {data.fresh_water_saved_m3.toLocaleString("en-US")}
              <span className="ms-2 text-3xl">m³</span>
            </p>
            <p>{TX.saved[lang]}</p>
          </div>
        )}
        <label className="mt-12 flex items-center justify-center gap-3 text-[15px]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-ink"
            checked={simulateFailure}
            onChange={(e) => {
              setSimulateFailure(e.target.checked);
              setTimeout(reload, 0);
            }}
          />
          {TX.simulate[lang]}
        </label>
      </Band>
    </>
  );
}
