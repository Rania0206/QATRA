interface Props {
  title: string;
  endpoints: string[];
}

export default function Placeholder({ title, endpoints }: Props) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">Placeholder: not implemented yet.</p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Endpoints</p>
      <ul className="mt-1 space-y-0.5 font-mono text-sm text-slate-600">
        {endpoints.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </section>
  );
}
