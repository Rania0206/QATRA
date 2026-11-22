import type { ComponentType } from "react";
import Shell from "./components/Shell";
import { useHashTab } from "./hooks/useHashTab";
import MapTab from "./features/map";
import BatchesTab from "./features/batches";
import CompatibilityTab from "./features/compatibility";
import AllocationTab from "./features/allocation";
import SavingsTab from "./features/savings";
import SoilTab from "./features/soil";
import HeatwaveTab from "./features/heatwave";
import MessagesTab from "./features/messages";
import ImpactTab from "./features/impact";
import BusinessTab from "./features/business"; // the "territory" route now shows the Business screen (A-14c)
import PublicTab from "./features/public";
import PassportPage from "./features/passport/PassportPage";

// One entry per feature tab. Add a tab = one line here (by agreement).
const TABS: { id: string; label: string; Component: ComponentType }[] = [
  { id: "map", label: "Map", Component: MapTab },
  { id: "batches", label: "Batches", Component: BatchesTab },
  { id: "compatibility", label: "Compatibility", Component: CompatibilityTab },
  { id: "allocation", label: "Allocation", Component: AllocationTab },
  { id: "savings", label: "Savings", Component: SavingsTab },
  { id: "soil", label: "Soil", Component: SoilTab },
  { id: "heatwave", label: "Heatwave", Component: HeatwaveTab },
  { id: "messages", label: "Messages", Component: MessagesTab },
  { id: "impact", label: "Impact", Component: ImpactTab },
  // QATRA Lite: next-version tabs stay at the end
  { id: "territory", label: "Business", Component: BusinessTab },
  { id: "public", label: "Public (next version)", Component: PublicTab },
];

const TAB_IDS = TABS.map((t) => t.id);

/** Pages outside the tabs, addressed by path (no router): /passport/{batch id}. */
const PASSPORT_PREFIX = "/passport/";

export default function App() {
  // Shell-less page for phones: the QR code of a batch opens it, so it must not carry the tabs.
  return window.location.pathname.startsWith(PASSPORT_PREFIX) ? <PassportPage /> : <TabsApp />;
}

function TabsApp() {
  const [active, setActive] = useHashTab(TAB_IDS, TABS[0].id);
  const { Component } = TABS.find((t) => t.id === active)!;

  return (
    <Shell tabs={TABS} active={active} onSelect={setActive}>
      <Component />
    </Shell>
  );
}
