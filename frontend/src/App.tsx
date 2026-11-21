import { useState, type ComponentType } from "react";
import { PROJECT_NAME, USE_MOCKS } from "./config";
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

export default function App() {
  const [active, setActive] = useState(TABS[0].id);
  const { Component } = TABS.find((t) => t.id === active)!;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-teal-800 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight">{PROJECT_NAME}</h1>
          {USE_MOCKS && <span className="rounded bg-teal-900 px-2 py-0.5 text-xs">mock API</span>}
        </div>
      </header>

      <div className="bg-amber-100 text-amber-900">
        <p className="mx-auto max-w-7xl px-4 py-2 text-sm">
          <strong>Demo data.</strong> Batches, farms and schedules are SIMULATED for the Zaouiet-Sousse
          demo. Real sources are labelled REPORTED, ESTIMATE or TO_VERIFY.
        </p>
      </div>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                active === t.id
                  ? "border-teal-700 text-teal-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Component />
      </main>
    </div>
  );
}
