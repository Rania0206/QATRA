import { useMemo, useState, type ReactNode } from "react";
import { get } from "../../api/client";
import type { AllFarmsCompatibility, Farm, MapFeature, MapLayer, MapLayersResponse, Plant } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import TagChip from "../../components/TagChip";
import { useApi } from "../../hooks/useApi";
import FarmCard from "./FarmCard";
import MapView, { DECISION_STYLE, isDrawable, type DecisionKey } from "./MapView";

const KNOWN: DecisionKey[] = ["compatible", "conditional", "blocked"];

export default function MapTab() {
  const layers = useApi<MapLayersResponse>(() => get<MapLayersResponse>("/api/map/layers"));
  const plants = useApi<Plant[]>(() => get<Plant[]>("/api/plants"));
  const farms = useApi<Farm[]>(() => get<Farm[]>("/api/farms"));
  // Live rules for every farm against the default batch. If it fails, the map falls back on expected_decision.
  const compat = useApi<AllFarmsCompatibility>(() => get<AllFarmsCompatibility>("/api/compatibility"));
  // Deep link: #/map?farm=A opens the card of farm A.
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("farm"));

  const list = layers.data?.layers ?? [];
  const farmFeatures = list.find((l) => l.id === "farms")?.features ?? [];

  const compatByFarm = useMemo(() => new Map((compat.data?.items ?? []).map((i) => [i.farm_id, i])), [compat.data]);
  const decisions = useMemo(() => {
    const out: Record<string, DecisionKey> = {};
    for (const f of farmFeatures) {
      const live = compatByFarm.get(f.id)?.decision;
      const expected = KNOWN.find((k) => k === f.expected_decision);
      out[f.id] = live ?? expected ?? "unknown"; // live rules first, then the data pack, else grey
    }
    return out;
  }, [farmFeatures, compatByFarm]);

  const live = compat.data !== undefined;
  const sourceNote = live
    ? `Source: live rules, batch ${compat.data!.batch_id} (${compat.data!.batch_status})`
    : compat.loading
      ? "Source: loading the live rules…"
      : "Source: expected_decision from the farm data (SIMULATED, farms A to C only). The live rules are not available.";

  if (layers.loading) return <Page><Loading label="Loading map layers…" /></Page>;
  if (layers.error) return <Page><ErrorBox error={layers.error} onRetry={layers.reload} /></Page>;
  if (list.length === 0) return <Page><ErrorBox error="The API returned no map layers." onRetry={layers.reload} /></Page>;

  const selectedFeature = farmFeatures.find((f) => f.id === selected);

  return (
    <Page>
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Map</h2>
        <p className="text-sm text-slate-500">Zaouiet-Sousse: treatment plants, farms coloured by compatibility, wells, basin. Click a farm for its card.</p>
      </div>
      {plants.error && <ErrorBox error={`Plant details unavailable: ${plants.error.message}`} onRetry={plants.reload} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <MapView layers={list} plants={plants.data ?? []} decisions={decisions} selectedFarm={selected} onSelectFarm={setSelected} />
        <div className="space-y-4">
          {selectedFeature ? (
            <FarmCard
              feature={selectedFeature}
              farm={farms.data?.find((f) => f.id === selectedFeature.id)}
              decision={decisions[selectedFeature.id] ?? "unknown"}
              compat={compatByFarm.get(selectedFeature.id)}
              sourceNote={sourceNote}
              onClose={() => setSelected(null)}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Click a farm on the map to see its card and why it is compatible, conditional or blocked.</p>
          )}
          <Legend sourceNote={sourceNote} tag={compat.data?.tag} />
        </div>
      </div>

      <LayerPanel layers={list} />
    </Page>
  );
}

/** Same width and side padding as the shell header. */
function Page({ children }: { children: ReactNode }) {
  return <section className="mx-auto w-full max-w-7xl space-y-4 px-5 py-8 sm:px-8">{children}</section>;
}

function Swatch({ colour, hollow }: { colour: string; hollow?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full"
      style={hollow ? { border: `2px dashed ${colour}`, background: `${colour}26` } : { background: colour, border: "2px solid #fff", boxShadow: "0 0 0 1px #64748b" }}
    />
  );
}

function Legend({ sourceNote, tag }: { sourceNote: string; tag?: { status: "REPORTED" | "ESTIMATE" | "PROJECTION" | "SIMULATED" | "TO_VERIFY"; source?: string } }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div>
        <h3 className="mb-1.5 font-semibold text-slate-800">Farms: compatibility</h3>
        <ul className="space-y-1">
          {(Object.keys(DECISION_STYLE) as DecisionKey[]).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <Swatch colour={DECISION_STYLE[k].colour} />
              {DECISION_STYLE[k].label}
              {k === "unknown" && <span className="text-xs text-slate-400">(no decision available)</span>}
            </li>
          ))}
        </ul>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {sourceNote}
          {tag && <TagChip tag={tag} showSource={false} />}
        </p>
      </div>
      <div>
        <h3 className="mb-1.5 font-semibold text-slate-800">Infrastructure</h3>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <Swatch colour="#0e7490" /> Real (OSM): wells, pumps
          </li>
          <li className="flex items-center gap-2">
            <Swatch colour="#22d3ee" hollow /> SIMULATED: farm wells, storage basin
          </li>
          <li className="flex items-center gap-2">
            <Swatch colour="#a21caf" /> Treatment plants (OSM, Sousse Sud TO_VERIFY)
          </li>
        </ul>
        <p className="mt-1 text-xs text-slate-500">Dashed hollow = simulated, solid = real. Simulated wells are drawn at their farm: the data has no well position.</p>
      </div>
    </div>
  );
}

function LayerPanel({ layers }: { layers: MapLayer[] }) {
  // Features without a location cannot be drawn: list them here instead (e.g. the irrigated perimeter).
  const unlocated = layers.flatMap((l) => l.features.filter((f) => !isDrawable(f)).map((f) => ({ layer: l, f })));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Layers</h3>
        <ul className="space-y-1.5 text-sm">
          {layers.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {l.label}{" "}
                <span className="text-slate-400">
                  ({l.features.some(isDrawable) ? `${l.features.filter(isDrawable).length} on the map` : "not drawn: no location"})
                </span>
              </span>
              <TagChip tag={l.tag} showSource={false} />
            </li>
          ))}
        </ul>
      </div>
      {unlocated.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Not drawn: no location in the data</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            {unlocated.map(({ layer, f }) => (
              <li key={`${layer.id}-${f.id}`}>
                <strong>{f.name}</strong>
                <Detail f={f} />
                <div className="mt-1">
                  <TagChip tag={layer.tag} showSource={false} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Detail({ f }: { f: MapFeature }) {
  const parts = [
    typeof f.area_ha === "number" ? `${f.area_ha} ha equipped` : null,
    f.wwtp ? `fed by ${f.wwtp}` : null,
    typeof f.tww_distributed_m3_yr === "number"
      ? `${f.tww_distributed_m3_yr.toLocaleString()} m³ distributed${f.campaign ? ` (${f.campaign})` : ""}`
      : null,
  ].filter(Boolean);
  return parts.length ? <span className="block text-slate-500">{parts.join(" · ")}</span> : null;
}
