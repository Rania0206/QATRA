import { useMemo, useState } from "react";
import { get } from "../../api/client";
import type { MapFeature, MapLayer, MapLayersResponse, Plant } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import { Band } from "../../components/ui";
import { getFarmCode } from "../../farm";
import { useApi } from "../../hooks/useApi";
import { useLang, type Lang } from "../../i18n";
import MapView, { isDrawable } from "./MapView";
import { M } from "./texts";

/**
 * Farmer view: the public layers (plants, irrigated area, farmland, basin) plus the farmer's OWN farm only.
 * The layer with all demo farms is never shown. (The API still sends it; real privacy needs a per-farm endpoint.)
 */
function forFarmer(all: MapLayer[], code: string | null): MapLayer[] {
  const farms = all.find((l) => l.id === "farms");
  const mine = code ? farms?.features.find((f) => f.id.toUpperCase() === code) : undefined;
  const rest = all.filter((l) => l.id !== "farms");
  return farms && mine ? [...rest, { id: "my_farm", label: "Your farm", tag: farms.tag, features: [mine] }] : rest;
}

export default function MapTab() {
  const { lang } = useLang();
  const layers = useApi<MapLayersResponse>(() => get<MapLayersResponse>("/api/map/layers"));
  const plants = useApi<Plant[]>(() => get<Plant[]>("/api/plants"));

  const [farmCode] = useState(getFarmCode);
  const list = useMemo(() => forFarmer(layers.data?.layers ?? [], farmCode), [layers.data, farmCode]);
  const hasMine = list.some((l) => l.id === "my_farm");
  // Features without a location cannot be drawn (e.g. the irrigated perimeter): their figures go in one line below the map.
  const unlocated = list.flatMap((l) => l.features.filter((f) => !isDrawable(f)));

  return (
    <Band tone="cream" wide className="!py-10 md:!py-12">
      <p className="text-[18px]">{M.lead[lang]}</p>
      {!hasMine && <p className="mt-1 text-[15px] text-ink-soft">{M.noFarmHint[lang]}</p>}
      <div className="mb-5" />
      {layers.loading ? (
        <Loading label={M.loading[lang]} />
      ) : layers.error ? (
        <ErrorBox error={layers.error} onRetry={layers.reload} />
      ) : list.length === 0 ? (
        <ErrorBox error={M.noLayers[lang]} onRetry={layers.reload} />
      ) : (
        <div className="space-y-4">
          {plants.error && <ErrorBox error={`${M.plantsDown[lang]}: ${plants.error.message}`} onRetry={plants.reload} />}
          <MapView layers={list} plants={plants.data ?? []} />
          {unlocated.map((f) => (
            <Detail key={f.id} f={f} lang={lang} />
          ))}
        </div>
      )}
    </Band>
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
  return (
    <p className="text-[15px] text-ink-soft">
      <span className="font-medium text-ink">{f.name}</span>
      {parts.length ? ` · ${parts.join(" · ")}` : ""}
    </p>
  );
}
