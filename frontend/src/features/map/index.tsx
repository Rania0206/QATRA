import { get } from "../../api/client";
import type { MapFeature, MapLayer, MapLayersResponse, Plant } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import { Band } from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useLang, type Lang } from "../../i18n";
import MapView, { FALLBACK, STYLE, isDrawable, layerLabel } from "./MapView";
import { M } from "./texts";

export default function MapTab() {
  const { lang } = useLang();
  const layers = useApi<MapLayersResponse>(() => get<MapLayersResponse>("/api/map/layers"));
  const plants = useApi<Plant[]>(() => get<Plant[]>("/api/plants"));

  const list = layers.data?.layers ?? [];

  return (
    <>
      <Band tone="cream" wide className="!py-10 md:!py-12">
        <p className="mb-5 text-[18px]">{M.lead[lang]}</p>
        {layers.loading ? (
          <Loading label={M.loading[lang]} />
        ) : layers.error ? (
          <ErrorBox error={layers.error} onRetry={layers.reload} />
        ) : list.length === 0 ? (
          <ErrorBox error={M.noLayers[lang]} onRetry={layers.reload} />
        ) : (
          <div className="space-y-8">
            {plants.error && <ErrorBox error={`${M.plantsDown[lang]}: ${plants.error.message}`} onRetry={plants.reload} />}
            <MapView layers={list} plants={plants.data ?? []} />
            <Legend layers={list} lang={lang} />
          </div>
        )}
      </Band>
    </>
  );
}

/** Which colour is which layer, with counts; features without a location are listed apart. */
function Legend({ layers, lang }: { layers: MapLayer[]; lang: Lang }) {
  const unlocated = layers.flatMap((l) => l.features.filter((f) => !isDrawable(f)).map((f) => ({ layer: l, f })));
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section>
        <h2 className="border-b border-ink pb-3 text-3xl">{M.layers[lang]}</h2>
        <ul>
          {layers.map((l) => {
            const n = l.features.filter(isDrawable).length;
            const colour = (STYLE[l.id] ?? FALLBACK).colour;
            return (
              <li key={l.id} className="flex items-center gap-3 border-b border-line py-3">
                <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border border-ink" style={{ background: colour }} />
                <span className="flex-1">{layerLabel(l, lang)}</span>
                <span className="text-[15px] text-ink-soft">{n > 0 ? `${n} ${M.onMap[lang]}` : M.noLocation[lang]}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {unlocated.length > 0 && (
        <section>
          <h2 className="border-b border-ink pb-3 text-3xl">{M.notDrawn[lang]}</h2>
          <ul>
            {unlocated.map(({ layer, f }) => (
              <li key={`${layer.id}-${f.id}`} className="border-b border-line py-3">
                <p className="font-medium">{f.name}</p>
                <Detail f={f} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Detail({ f, lang }: { f: MapFeature; lang: Lang }) {
  const parts = [
    typeof f.area_ha === "number" ? `${f.area_ha} ha ${M.equipped[lang]}` : null,
    f.wwtp ? `${M.fedBy[lang]} ${f.wwtp}` : null,
    typeof f.tww_distributed_m3_yr === "number"
      ? `${f.tww_distributed_m3_yr.toLocaleString("en-US")} m³ ${M.distributed[lang]}${f.campaign ? ` (${f.campaign})` : ""}`
      : null,
  ].filter(Boolean);
  return parts.length ? <p className="text-[15px] text-ink-soft">{parts.join(" · ")}</p> : null;
}
