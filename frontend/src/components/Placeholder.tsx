import { Band, Intro } from "./ui";

interface Props {
  title: string;
  endpoints: string[];
}

/** Screen not built yet: one calm band, with the API it will use. */
export default function Placeholder({ title, endpoints }: Props) {
  return (
    <>
      <Band tone="olive" className="md:py-32">
        <Intro as="h1" size="xl" eyebrow="Coming next" title={`${title}.`}>
          <p>This part of QATRA is being built. It will read the endpoints below.</p>
        </Intro>
      </Band>
      <Band tone="cream">
        <ul className="mx-auto max-w-md space-y-3 text-center font-mono text-[16px]">
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
