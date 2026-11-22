import { useEffect, useState } from "react";
import { CircleMarker, LayerGroup, LayersControl, MapContainer, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import type { MapFeature, MapLayer, Plant } from "../../api/types";
import { isRtl, useLang, type Lang } from "../../i18n";
import { cropName } from "../compatibility/format";
import { LAYER_LABEL, M } from "./texts";

// Zaouiet-Sousse (same centre and zoom as data/map_preview.html).
const CENTRE: LatLngTuple = [35.79, 10.62];
const ZOOM = 12;

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Colour + radius per layer id. Light, earthy colours that stay readable on satellite imagery.
// Circles and polygons, no marker images (avoids the Vite icon-path issue).
export const STYLE: Record<string, { colour: string; radius: number }> = {
  plants: { colour: "#ffffff", radius: 11 },
  osm_plants: { colour: "#e2d9c3", radius: 7 },
  my_farm: { colour: "#f2c14e", radius: 11 }, // the farmer's own farm, stands out from the rest
  basin: { colour: "#8fd3e8", radius: 8 },
  farmland: { colour: "#b9d86b", radius: 0 },
};
export const FALLBACK = { colour: "#f3ebe0", radius: 6 };
const OUTLINE = "#1b1b1a";

export const layerLabel = (l: MapLayer, lang: Lang) => LAYER_LABEL[l.id]?.[lang] ?? l.label;

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

function FeaturePopup({ f, layer, plant, lang }: { f: MapFeature; layer: MapLayer; plant?: Plant; lang: Lang }) {
  const source = (plant ? plant.tag : layer.tag).source;
  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="min-w-52 space-y-1.5 text-[15px]">
      <p className="font-display text-xl leading-tight">{f.name}</p>
      <p className="text-[14px] text-ink-soft">{layerLabel(layer, lang)}</p>
      {plant ? (
        <ul className="space-y-1">
          <li>
            {M.capacity[lang]}:{" "}
            {plant.capacity_m3_d === null ? M.unknown[lang] : `${plant.capacity_m3_d.toLocaleString("en-US")} ${M.perDay[lang]}`}
            <span className="block text-[14px] text-ink-soft">{M.capacityNote[lang]}</span>
          </li>
          <li>
            {M.treatment[lang]}: {plant.treatment_level}
          </li>
          {plant.serves_perimeter && (
            <li>
              {M.serves[lang]}: {plant.serves_perimeter}
            </li>
          )}
        </ul>
      ) : (
        <ul className="space-y-1">
          {f.crop && (
            <li>
              {M.crop[lang]}: {cropName(f.crop, lang)}
            </li>
          )}
          {f.landuse && (
            <li>
              {M.landUse[lang]}: {f.landuse}
            </li>
          )}
          {typeof f.area_ha === "number" && (
            <li>
              {M.area[lang]}: {f.area_ha} ha
            </li>
          )}
          {typeof f.capacity_m3 === "number" && (
            <li>
              {M.capacity[lang]}: {f.capacity_m3.toLocaleString("en-US")} m³
            </li>
          )}
        </ul>
      )}
      {source && <p className="break-words text-[13px] text-ink-soft">{source}</p>}
    </div>
  );
}

function LayerFeatures({ layer, plants, lang }: { layer: MapLayer; plants: Plant[]; lang: Lang }) {
  const style = STYLE[layer.id] ?? FALLBACK;
  return (
    <LayerGroup>
      {layer.features.map((f) => {
        const popup = (
          <Popup maxWidth={320}>
            <FeaturePopup f={f} layer={layer} lang={lang} plant={layer.id === "plants" ? plants.find((p) => p.id === f.id) : undefined} />
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
            pathOptions={{ color: OUTLINE, weight: 2, fillColor: style.colour, fillOpacity: 0.95 }}
          >
            {layer.id === "my_farm" && <Tooltip direction="right" permanent offset={[10, 0]}>{M.yourFarm[lang]}</Tooltip>}
            {popup}
          </CircleMarker>
        );
      })}
    </LayerGroup>
  );
}

/** Farmer view: frame his own farm together with the treatment plants, so he sees where his water comes from. */
function FitToFarm({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) map.fitBounds(points, { padding: [80, 80], maxZoom: 13, animate: false });
    // once, when the map is created (it is remounted when the language changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

export default function MapView({ layers, plants }: { layers: MapLayer[]; plants: Plant[] }) {
  const { lang } = useLang();
  const [tilesFailed, setTilesFailed] = useState(false);
  const mine = layers.find((l) => l.id === "my_farm")?.features.find(hasCoords);
  const framing: LatLngTuple[] = mine
    ? [
        [mine.lat, mine.lon],
        ...layers.filter((l) => l.id === "plants").flatMap((l) => l.features.filter(hasCoords).map((f): LatLngTuple => [f.lat, f.lon])),
      ]
    : [];
  return (
    <div className="space-y-3">
      {tilesFailed && (
        <p role="status" className="border border-warn px-4 py-2 text-[15px] text-warn">
          {M.tilesFailed[lang]}
        </p>
      )}
      {/* the map itself always reads left-to-right (Leaflet controls); popups switch back for Arabic */}
      <div dir="ltr">
        <MapContainer
          key={lang /* layer names are read once: remount when the language changes */}
          center={CENTRE}
          zoom={ZOOM}
          scrollWheelZoom
          className="isolate h-[68vh] min-h-96 w-full border border-line bg-sand"
        >
          <FitToFarm points={framing} />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name={M.satellite[lang]}>
              <TileLayer url={ESRI} attribution={ESRI_ATTR} maxZoom={19} eventHandlers={{ tileerror: () => setTilesFailed(true) }} />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name={M.streets[lang]}>
              <TileLayer url={OSM} attribution={OSM_ATTR} maxZoom={19} eventHandlers={{ tileerror: () => setTilesFailed(true) }} />
            </LayersControl.BaseLayer>
            {layers
              .filter((l) => l.features.some(isDrawable))
              .map((l) => (
                <LayersControl.Overlay key={l.id} checked name={layerLabel(l, lang)}>
                  <LayerFeatures layer={l} plants={plants} lang={lang} />
                </LayersControl.Overlay>
              ))}
          </LayersControl>
        </MapContainer>
      </div>
    </div>
  );
}
