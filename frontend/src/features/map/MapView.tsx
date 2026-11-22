import { useState } from "react";
import { CircleMarker, LayerGroup, LayersControl, MapContainer, Polygon, Popup, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import type { Decision, MapFeature, MapLayer, Plant } from "../../api/types";
import TagChip from "../../components/TagChip";

// Zaouiet-Sousse (same centre and zoom as data/map_preview.html).
const CENTRE: LatLngTuple = [35.79, 10.62];
const ZOOM = 12;

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type DecisionKey = Decision | "unknown";

// Farm colour = compatibility decision. The word is always shown too (tooltip, card, legend).
export const DECISION_STYLE: Record<DecisionKey, { colour: string; label: string }> = {
  compatible: { colour: "#16a34a", label: "Compatible" },
  conditional: { colour: "#f59e0b", label: "Conditional" },
  blocked: { colour: "#dc2626", label: "Blocked" },
  unknown: { colour: "#94a3b8", label: "Unknown" },
};

// Colour + radius per layer id. Circles and polygons, no marker images (avoids the Vite icon-path issue).
// SIMULATED layers are drawn hollow with a dashed outline, real (REPORTED) ones solid with a white outline.
const STYLE: Record<string, { colour: string; radius: number }> = {
  plants: { colour: "#a21caf", radius: 11 },
  osm_plants: { colour: "#e879f9", radius: 7 },
  wells_sim: { colour: "#22d3ee", radius: 14 }, // ring around the farm marker it is drawn at
  pumps_osm: { colour: "#0e7490", radius: 7 },
  basin: { colour: "#22d3ee", radius: 11 },
  farmland: { colour: "#a3e635", radius: 0 },
};
const FALLBACK = { colour: "#e2e8f0", radius: 6 };

export const hasCoords = (f: MapFeature): f is MapFeature & { lat: number; lon: number } =>
  typeof f.lat === "number" && typeof f.lon === "number" && Number.isFinite(f.lat) && Number.isFinite(f.lon);

/** GeoJSON [lon, lat] rings -> Leaflet [lat, lon]. Returns null for anything malformed, so one bad feature never crashes the map. */
export function polygonPositions(f: MapFeature): LatLngTuple[][] | null {
  const rings = f.geometry?.type === "Polygon" ? f.geometry.coordinates : null;
  if (!Array.isArray(rings)) return null;
  const out = rings
    .map((ring) =>
      Array.isArray(ring)
        ? ring.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map((p): LatLngTuple => [p[1], p[0]])
        : [],
    )
    .filter((ring) => ring.length >= 3);
  return out.length ? out : null;
}

export const isDrawable = (f: MapFeature) => hasCoords(f) || polygonPositions(f) !== null;

function FeaturePopup({ f, layer, plant }: { f: MapFeature; layer: MapLayer; plant?: Plant }) {
  const tag = plant ? plant.tag : layer.tag;
  return (
    <div className="min-w-48 space-y-1.5 text-sm">
      <p className="text-base font-semibold text-slate-900">{f.name}</p>
      <p className="text-xs text-slate-500">
        {layer.label} · {f.id}
      </p>
      {plant ? (
        <ul className="space-y-0.5 text-slate-700">
          <li>
            Capacity: {plant.capacity_m3_d === null ? "unknown" : `${plant.capacity_m3_d.toLocaleString()} m³/day`}
            <span className="block text-xs text-slate-500">Treatment capacity, not the volume available to farmers.</span>
          </li>
          <li>Treatment level: {plant.treatment_level}</li>
          {plant.serves_perimeter && <li>Serves: {plant.serves_perimeter}</li>}
        </ul>
      ) : (
        <ul className="space-y-0.5 text-slate-700">
          {f.crop && <li>Crop: {f.crop.replace(/_/g, " ")}</li>}
          {f.landuse && <li>Land use: {f.landuse}</li>}
          {typeof f.area_ha === "number" && <li>Area: {f.area_ha} ha</li>}
          {typeof f.capacity_m3 === "number" && <li>Capacity: {f.capacity_m3.toLocaleString()} m³</li>}
          {typeof f.head_m === "number" && <li>Head: {f.head_m} m</li>}
          {typeof f.flow_m3_h === "number" && <li>Flow: {f.flow_m3_h} m³/h</li>}
        </ul>
      )}
      <TagChip tag={tag} showSource={false} />
      {tag.source && <p className="break-words text-xs text-slate-500">{tag.source}</p>}
    </div>
  );
}

interface FarmProps {
  decisions: Record<string, DecisionKey>;
  selectedFarm: string | null;
  onSelectFarm: (id: string) => void;
}

/** Farms: the OSM polygon (when there is one) plus a marker at lat/lon, both coloured by decision. Click selects the farm. */
function FarmFeatures({ layer, decisions, selectedFarm, onSelectFarm }: { layer: MapLayer } & FarmProps) {
  return (
    <LayerGroup>
      {layer.features.map((f) => {
        const decision = decisions[f.id] ?? "unknown";
        const { colour, label } = DECISION_STYLE[decision];
        const selected = f.id === selectedFarm;
        const polygon = polygonPositions(f);
        const tip = `Farm ${f.id}${f.crop ? ` · ${f.crop.replace(/_/g, " ")}` : ""} · ${label}`;
        const handlers = { click: () => onSelectFarm(f.id) };
        return (
          <LayerGroup key={f.id}>
            {polygon && (
              <Polygon positions={polygon} eventHandlers={handlers}
                pathOptions={{ color: colour, weight: selected ? 4 : 2, fillColor: colour, fillOpacity: selected ? 0.55 : 0.4 }} />
            )}
            {hasCoords(f) && (
              <CircleMarker center={[f.lat, f.lon]} radius={selected ? 11 : 8} eventHandlers={handlers}
                pathOptions={{ color: selected ? "#0f172a" : "#ffffff", weight: selected ? 3 : 2, fillColor: colour, fillOpacity: 1 }}>
                <Tooltip direction="right" offset={[8, 0]}>{tip}</Tooltip>
              </CircleMarker>
            )}
          </LayerGroup>
        );
      })}
    </LayerGroup>
  );
}

function LayerFeatures({ layer, plants }: { layer: MapLayer; plants: Plant[] }) {
  const style = STYLE[layer.id] ?? FALLBACK;
  const simulated = layer.tag.status === "SIMULATED";
  return (
    <LayerGroup>
      {layer.features.map((f) => {
        const popup = (
          <Popup maxWidth={320}>
            <FeaturePopup f={f} layer={layer} plant={layer.id === "plants" ? plants.find((p) => p.id === f.id) : undefined} />
          </Popup>
        );
        const polygon = polygonPositions(f);
        if (polygon) {
          return (
            <Polygon key={f.id} positions={polygon} pathOptions={{ color: style.colour, weight: 2, fillOpacity: 0.25 }}>
              {popup}
            </Polygon>
          );
        }
        if (!hasCoords(f)) return null; // no location: never drawn, never a crash
        return (
          <CircleMarker
            key={f.id}
            center={[f.lat, f.lon]}
            radius={style.radius}
            pathOptions={
              simulated
                ? { color: style.colour, weight: 3, dashArray: "4 3", fillColor: style.colour, fillOpacity: 0.15 }
                : { color: "#ffffff", weight: 2, fillColor: style.colour, fillOpacity: 0.95 }
            }
          >
            {popup}
          </CircleMarker>
        );
      })}
    </LayerGroup>
  );
}

export default function MapView({ layers, plants, decisions, selectedFarm, onSelectFarm }: { layers: MapLayer[]; plants: Plant[] } & FarmProps) {
  const [tilesFailed, setTilesFailed] = useState(false);
  return (
    <div className="space-y-2">
      {tilesFailed && (
        <p role="status" className="rounded bg-amber-50 p-2 text-sm text-amber-900">
          Basemap tiles could not be loaded (offline?). The QATRA layers below are still shown.
        </p>
      )}
      <MapContainer center={CENTRE} zoom={ZOOM} scrollWheelZoom className="isolate h-[65vh] min-h-96 w-full rounded-lg border border-slate-200 bg-slate-200">
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite (Esri)">
            <TileLayer url={ESRI} attribution={ESRI_ATTR} maxZoom={19} eventHandlers={{ tileerror: () => setTilesFailed(true) }} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer url={OSM} attribution={OSM_ATTR} maxZoom={19} eventHandlers={{ tileerror: () => setTilesFailed(true) }} />
          </LayersControl.BaseLayer>
          {/* farms last, so their decision colour is never hidden by the layers drawn at the same place */}
          {[...layers.filter((l) => l.id !== "farms"), ...layers.filter((l) => l.id === "farms")]
            .filter((l) => l.features.some(isDrawable))
            .map((l) => (
              <LayersControl.Overlay key={l.id} checked name={l.label}>
                {l.id === "farms" ? (
                  <FarmFeatures layer={l} decisions={decisions} selectedFarm={selectedFarm} onSelectFarm={onSelectFarm} />
                ) : (
                  <LayerFeatures layer={l} plants={plants} />
                )}
              </LayersControl.Overlay>
            ))}
        </LayersControl>
      </MapContainer>
    </div>
  );
}
