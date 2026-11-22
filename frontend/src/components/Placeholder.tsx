import { C, TAB_LABEL, useLang } from "../i18n";
import { Band, Intro } from "./ui";

interface Props {
  title: string;
  endpoints: string[];
}

/** Screen not built yet: one calm band, with the API it will use. */
export default function Placeholder({ title, endpoints }: Props) {
  const { lang } = useLang();
  // titles come from the feature files in English; translate through the tab names when known
  const known = Object.values(TAB_LABEL).find((t) => t.en === title);
  return (
    <>
      <Band tone="olive">
        <Intro as="h1" size="xl" eyebrow={C.comingNext[lang]} title={known ? known[lang] : title}>
          <p>{C.building[lang]}</p>
        </Intro>
      </Band>
      <Band tone="cream">
        <ul dir="ltr" className="mx-auto max-w-md space-y-3 text-center text-[length:calc(16px*var(--fs))]">
          {endpoints.map((e) => (
            <li key={e} className="border-b border-line pb-3 last:border-0">
              {e}
            </li>
          ))}
        </ul>
      </Band>
    </>
  );
}
