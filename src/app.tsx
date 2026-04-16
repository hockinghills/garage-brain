import { useAgent } from "agents/react";
import type { GarageState } from "./server";

export default function App() {
  const agent = useAgent<GarageState>({ agent: "GarageAgent" });

  return (
    <div className="flex items-center justify-center min-h-screen bg-kumo-bg-page">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-kumo-text-primary">
          Garage Brain
        </h1>
        <p className="text-kumo-text-secondary">
          {agent.state?.greeting ?? "Connecting..."}
        </p>
        <button
          className="px-4 py-2 rounded-lg bg-kumo-bg-brand text-kumo-text-on-brand"
          onClick={async () => {
            const reply = await agent.call("ping");
            alert(reply);
          }}
        >
          Knock knock
        </button>
      </div>
    </div>
  );
}
