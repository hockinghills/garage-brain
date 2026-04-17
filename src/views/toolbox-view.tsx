import { useState } from "react";
import type { ToolboxState } from "../agents/toolbox";

type AgentLike = {
  state: ToolboxState | undefined;
  call: (method: string, args?: unknown) => Promise<unknown>;
};

export function ToolboxView({ agent }: { agent: AgentLike }) {
  const tools = agent.state?.tools ?? [];
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    await agent.call("addTool", {
      name,
      category: category || undefined,
      location: location || undefined,
    });
    setName("");
    setCategory("");
    setLocation("");
  };

  // Group by category
  const byCategory = tools.reduce<Record<string, typeof tools>>((acc, t) => {
    const cat = t.category || "Uncategorized";
    (acc[cat] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-kumo-text-primary">Toolbox</h1>
        <p className="text-kumo-text-secondary mt-1">
          {tools.length === 0
            ? "No tools yet."
            : `${tools.length} tool${tools.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="rounded-xl border border-kumo-border-primary bg-kumo-bg-elevated p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2">
          <input
            className="kumo-input"
            placeholder="Tool name (e.g. '10mm wrench')"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            className="kumo-input"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            className="kumo-input"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button
            className="px-4 py-2 rounded-lg bg-kumo-bg-brand text-kumo-text-on-brand font-medium disabled:opacity-50"
            disabled={!name.trim()}
            onClick={add}
          >
            Add
          </button>
        </div>
      </div>

      {tools.length === 0 ? (
        <div className="text-kumo-text-secondary py-8 text-center">
          Add tools to track what you have, where it lives, and bring it across
          all your vehicles.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, list]) => (
              <div key={cat}>
                <div className="text-xs uppercase text-kumo-text-tertiary mb-2">
                  {cat}
                </div>
                <div className="space-y-1">
                  {list.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-kumo-border-primary bg-kumo-bg-elevated group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-kumo-text-primary">
                          {t.name}
                        </div>
                        {(t.location || t.notes) && (
                          <div className="text-xs text-kumo-text-secondary flex gap-3">
                            {t.location && <span>📍 {t.location}</span>}
                            {t.notes && <span>{t.notes}</span>}
                          </div>
                        )}
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-sm text-kumo-text-danger"
                        onClick={async () => {
                          if (confirm(`Remove "${t.name}"?`)) {
                            await agent.call("deleteTool", t.id);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
