import type { ComponentType } from "react";
import Shell from "./components/Shell";
import { useHashTab } from "./hooks/useHashTab";
import MapTab from "./features/map";
import BatchesTab from "./features/batches";
import CompatibilityTab from "./features/compatibility";
import AllocationTab from "./features/allocation";
import SoilTab from "./features/soil";
import HeatwaveTab from "./features/heatwave";
import MessagesTab from "./features/messages";
import ImpactTab from "./features/impact";
import TerritoryTab from "./features/territory";
import PublicTab from "./features/public";

// One entry per feature tab. Add a tab = one line here (by agreement).
const TABS: { id: string; label: string; Component: ComponentType }[] = [
  { id: "map", label: "Map", Component: MapTab },
  { id: "batches", label: "Batches", Component: BatchesTab },
  { id: "compatibility", label: "Compatibility", Component: CompatibilityTab },
  { id: "allocation", label: "Allocation", Component: AllocationTab },
  { id: "soil", label: "Soil", Component: SoilTab },
  { id: "heatwave", label: "Heatwave", Component: HeatwaveTab },
  { id: "messages", label: "Messages", Component: MessagesTab },
  { id: "impact", label: "Impact", Component: ImpactTab },
  { id: "territory", label: "Territory", Component: TerritoryTab },
  { id: "public", label: "Public", Component: PublicTab },
];

const TAB_IDS = TABS.map((t) => t.id);

export default function App() {
  const [active, setActive] = useHashTab(TAB_IDS, TABS[0].id);
  const { Component } = TABS.find((t) => t.id === active)!;

  return (
    <Shell tabs={TABS} active={active} onSelect={setActive}>
      <Component />
    </Shell>
  );
}
