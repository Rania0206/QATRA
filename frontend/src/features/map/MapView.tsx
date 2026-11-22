import { useState } from "react";
import { CircleMarker, LayerGroup, LayersControl, MapContainer, Polygon, Popup, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import type { MapFeature, MapLayer, Plant } from "../../api/types";
import TagChip from "../../components/TagChip";

// Zaouiet-Sousse (same centre and zoom as data/map_preview.html).
const CENTRE: LatLngTuple = [35.79, 10.62];
const ZOOM = 12;

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Colour + radius per layer id. Circles and polygons, no marker images (avoids the Vite icon-path issue).
const STYLE: Record<string, { colour: string; radius: number }> = {
  plants: { colour: "#a21caf", radius: 11 },
  osm_plants: { colour: "#e879f9", radius: 7 },
  farms: { colour: "#f59e0b", radius: 7 },
  basin: { colour: "#22d3ee", radius: 8 },
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
        </ul>
      )}
      <TagChip tag={plant ? plant.tag : layer.tag} showSource={false} />
      {(plant ? plant.tag : layer.tag).source && (
        <p className="break-words text-xs text-slate-500">{(plant ? plant.tag : layer.tag).source}</p>
      )}
    </div>
  );
}

function LayerFeatures({ layer, plants }: { layer: MapLayer; plants: Plant[] }) {
  const style = STYLE[layer.id] ?? FALLBACK;
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
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: style.colour, fillOpacity: 0.95 }}
          >
            {layer.id === "farms" && <Tooltip direction="right" offset={[8, 0]}>{`Farm ${f.id}`}</Tooltip>}
            {popup}
          </CircleMarker>
        );
      })}
    </LayerGroup>
  );
}

export default function MapView({ layers, plants }: { layers: MapLayer[]; plants: Plant[] }) {
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
          {layers
            .filter((l) => l.features.some(isDrawable))
            .map((l) => (
              <LayersControl.Overlay key={l.id} checked name={l.label}>
                <LayerFeatures layer={l} plants={plants} />
              </LayersControl.Overlay>
            ))}
        </LayersControl>
      </MapContainer>
    </div>
  );
}
