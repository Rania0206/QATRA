import { get } from "../../api/client";
import type { MapFeature, MapLayer, MapLayersResponse, Plant } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import TagChip from "../../components/TagChip";
import { useApi } from "../../hooks/useApi";
import MapView, { isDrawable } from "./MapView";

export default function MapTab() {
  const layers = useApi<MapLayersResponse>(() => get<MapLayersResponse>("/api/map/layers"));
  const plants = useApi<Plant[]>(() => get<Plant[]>("/api/plants"));

  if (layers.loading) return <Loading label="Loading map layers…" />;
  if (layers.error) return <ErrorBox error={layers.error} onRetry={layers.reload} />;
  const list = layers.data?.layers ?? [];
  if (list.length === 0) return <ErrorBox error="The API returned no map layers." onRetry={layers.reload} />;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Map</h2>
        <p className="text-sm text-slate-500">Zaouiet-Sousse: treatment plants, irrigated area, farmland and demo farms. Click a marker or a field.</p>
      </div>
      {plants.error && <ErrorBox error={`Plant details unavailable: ${plants.error.message}`} onRetry={plants.reload} />}
      <MapView layers={list} plants={plants.data ?? []} />
      <LegendPanel layers={list} />
    </section>
  );
}

function LegendPanel({ layers }: { layers: MapLayer[] }) {
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
