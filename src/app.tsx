import { useState } from "react";
import { useAgent } from "agents/react";
import type { GarageState, VehicleRef } from "./agents/garage";
import type { ToolboxState } from "./agents/toolbox";
import { GarageView } from "./views/garage-view";
import { VehicleView } from "./views/vehicle-view";
import { ToolboxView } from "./views/toolbox-view";

type Route =
  | { kind: "garage" }
  | { kind: "vehicle"; vehicle: VehicleRef }
  | { kind: "toolbox" };

export default function App() {
  const garage = useAgent<GarageState>({ agent: "GarageAgent" });
  const toolbox = useAgent<ToolboxState>({ agent: "ToolboxAgent" });
  const [route, setRoute] = useState<Route>({ kind: "garage" });

  const vehicles = garage.state?.vehicles ?? [];

  return (
    <div className="flex min-h-screen bg-kumo-bg-page text-kumo-text-primary">
      <aside className="w-64 shrink-0 border-r border-kumo-border-primary bg-kumo-bg-surface p-4 space-y-6">
        <div>
          <div className="text-sm uppercase tracking-wide text-kumo-text-tertiary mb-2">
            Garage Brain
          </div>
          <button
            onClick={() => setRoute({ kind: "garage" })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
              route.kind === "garage"
                ? "bg-kumo-bg-elevated text-kumo-text-primary"
                : "text-kumo-text-secondary hover:bg-kumo-bg-elevated"
            }`}
          >
            🏠 My Garage
            {vehicles.length > 0 && (
              <span className="ml-1 text-xs text-kumo-text-tertiary">
                ({vehicles.length})
              </span>
            )}
          </button>
        </div>

        {vehicles.length > 0 && (
          <div>
            <div className="text-xs uppercase text-kumo-text-tertiary mb-2 px-3">
              Vehicles
            </div>
            <div className="space-y-0.5">
              {vehicles.map((v) => {
                const active =
                  route.kind === "vehicle" && route.vehicle.id === v.id;
                const label =
                  v.nickname || `${v.year} ${v.make} ${v.model}`;
                return (
                  <button
                    key={v.id}
                    onClick={() => setRoute({ kind: "vehicle", vehicle: v })}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${
                      active
                        ? "bg-kumo-bg-elevated text-kumo-text-primary font-medium"
                        : "text-kumo-text-secondary hover:bg-kumo-bg-elevated"
                    }`}
                    title={label}
                  >
                    🚗 {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <button
            onClick={() => setRoute({ kind: "toolbox" })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
              route.kind === "toolbox"
                ? "bg-kumo-bg-elevated text-kumo-text-primary"
                : "text-kumo-text-secondary hover:bg-kumo-bg-elevated"
            }`}
          >
            🔧 Toolbox
            {(toolbox.state?.tools.length ?? 0) > 0 && (
              <span className="ml-1 text-xs text-kumo-text-tertiary">
                ({toolbox.state!.tools.length})
              </span>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {route.kind === "garage" && (
          <GarageView
            agent={garage}
            onSelect={(v) => setRoute({ kind: "vehicle", vehicle: v })}
          />
        )}
        {route.kind === "vehicle" && (
          <VehicleView
            vehicleRef={route.vehicle}
            onBack={() => setRoute({ kind: "garage" })}
          />
        )}
        {route.kind === "toolbox" && <ToolboxView agent={toolbox} />}
      </main>
    </div>
  );
}
