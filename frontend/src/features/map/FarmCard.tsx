import type { Farm, FarmCompatibility, MapFeature } from "../../api/types";
import TagChip from "../../components/TagChip";
import { DECISION_STYLE, type DecisionKey } from "./MapView";

interface Props {
  feature: MapFeature;
  farm?: Farm;
  decision: DecisionKey;
  compat?: FarmCompatibility;
  sourceNote: string;
  onClose: () => void;
}

const SEVERITY: Record<string, string> = { block: "Blocks", condition: "Condition", info: "Note" };

/** Side card of the map: the selected farm, its decision and the rules behind it. */
export default function FarmCard({ feature, farm, decision, compat, sourceNote, onClose }: Props) {
  const { colour, label } = DECISION_STYLE[decision];
  const crop = (farm?.crop ?? feature.crop ?? "").replace(/_/g, " ");
  const failed = compat?.results.filter((r) => !r.passed) ?? [];

  return (
    <aside aria-label={`Farm ${feature.id}`} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{farm?.name ?? feature.name}</h3>
          <p className="text-xs text-slate-500">Farm {feature.id}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close farm card" className="rounded px-2 py-0.5 text-lg leading-none text-slate-500 hover:bg-slate-100">
          ×
        </button>
      </div>

      <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold" style={{ borderColor: colour }}>
        <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: colour }} />
        {label}
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-500">Crop</dt>
        <dd className="capitalize">{crop || "n/a"}</dd>
        <dt className="text-slate-500">Area</dt>
        <dd>{farm ? `${farm.area_ha} ha` : "n/a"}</dd>
        <dt className="text-slate-500">Soil ECe</dt>
        <dd>{farm ? `${farm.soil_ece} dS/m` : "n/a"}</dd>
        <dt className="text-slate-500">Distance to plant</dt>
        <dd>{farm ? `${farm.distance_km} km` : "n/a"}</dd>
        <dt className="text-slate-500">Fresh water now</dt>
        <dd>{farm ? farm.fresh_source : "n/a"}</dd>
      </dl>

      <div className="space-y-1.5">
        <h4 className="text-sm font-semibold text-slate-800">Why {label.toLowerCase()}</h4>
        {compat ? (
          failed.length === 0 ? (
            <p className="text-sm text-slate-600">All rules passed for batch {compat.batch_id}.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {failed.map((r) => (
                <li key={r.rule_id} className="rounded border border-slate-200 p-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{SEVERITY[r.severity] ?? r.severity}</span>
                  <p className="text-slate-800">{r.reason_en}</p>
                  {r.legal_ref && <p className="text-xs text-slate-500">{r.legal_ref}</p>}
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-slate-600">No rule details: the live compatibility rules are not available.</p>
        )}
        <p className="text-xs text-slate-400">{sourceNote}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {farm && <TagChip tag={farm.tag} showSource={false} />}
        {compat && <TagChip tag={compat.tag} showSource={false} />}
      </div>
    </aside>
  );
}
