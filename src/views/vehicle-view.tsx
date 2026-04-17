import { useState } from "react";
import { useAgent } from "agents/react";
import type {
  VehicleState,
  Project,
  Part,
  MaintenanceEntry,
} from "../agents/vehicle";
import type { VehicleRef } from "../agents/garage";

type Tab = "projects" | "parts" | "maintenance" | "info";

export function VehicleView({
  vehicleRef,
  onBack,
}: {
  vehicleRef: VehicleRef;
  onBack: () => void;
}) {
  const agent = useAgent<VehicleState>({
    agent: "VehicleAgent",
    name: vehicleRef.id,
  });
  const [tab, setTab] = useState<Tab>("projects");
  const state = agent.state;

  // Seed info on first load if missing
  if (state && !state.info) {
    agent.call("setInfo", [{
      make: vehicleRef.make,
      model: vehicleRef.model,
      year: vehicleRef.year,
      nickname: vehicleRef.nickname,
    }]);
  }

  const label = vehicleRef.nickname || `${vehicleRef.year} ${vehicleRef.make} ${vehicleRef.model}`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-kumo-text-secondary hover:text-kumo-text-primary"
        >
          ← Garage
        </button>
        <h1 className="text-2xl font-bold text-kumo-text-primary flex-1">
          {label}
        </h1>
      </div>

      <div className="flex gap-1 border-b border-kumo-border-primary">
        {(["projects", "parts", "maintenance", "info"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-kumo-border-accent text-kumo-text-primary font-medium"
                : "border-transparent text-kumo-text-secondary hover:text-kumo-text-primary"
            }`}
          >
            {t}
            {t === "projects" && state?.projects.length
              ? ` (${state.projects.length})`
              : ""}
            {t === "parts" && state?.parts.length ? ` (${state.parts.length})` : ""}
            {t === "maintenance" && state?.maintenance.length
              ? ` (${state.maintenance.length})`
              : ""}
          </button>
        ))}
      </div>

      {!state ? (
        <div className="text-kumo-text-secondary py-8 text-center">Connecting…</div>
      ) : (
        <>
          {tab === "projects" && <ProjectsTab agent={agent} projects={state.projects} parts={state.parts} />}
          {tab === "parts" && <PartsTab agent={agent} parts={state.parts} />}
          {tab === "maintenance" && <MaintenanceTab agent={agent} entries={state.maintenance} />}
          {tab === "info" && <InfoTab agent={agent} info={state.info} />}
        </>
      )}
    </div>
  );
}

// ---------- Projects ----------

function ProjectsTab({
  agent,
  projects,
  parts,
}: {
  agent: { call: (m: string, args?: unknown) => Promise<unknown> };
  projects: Project[];
  parts: Part[];
}) {
  const [title, setTitle] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="kumo-input flex-1"
          placeholder="New project title (e.g. 'Replace front brake pads')"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && title.trim()) {
              await agent.call("addProject", [{ title }]);
              setTitle("");
            }
          }}
        />
        <button
          className="px-4 py-2 rounded-lg bg-kumo-bg-brand text-kumo-text-on-brand font-medium disabled:opacity-50"
          disabled={!title.trim()}
          onClick={async () => {
            await agent.call("addProject", [{ title }]);
            setTitle("");
          }}
        >
          Add
        </button>
      </div>

      {projects.length === 0 && (
        <div className="text-kumo-text-secondary py-8 text-center">
          No projects yet.
        </div>
      )}

      <div className="space-y-2">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            parts={parts}
            expanded={expandedId === p.id}
            onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
            agent={agent}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  parts,
  expanded,
  onToggle,
  agent,
}: {
  project: Project;
  parts: Part[];
  expanded: boolean;
  onToggle: () => void;
  agent: { call: (m: string, args?: unknown) => Promise<unknown> };
}) {
  const [stepText, setStepText] = useState("");
  const doneCount = project.steps.filter((s) => s.done).length;
  const linkedParts = parts.filter((p) => project.partIds.includes(p.id));

  return (
    <div className="rounded-xl border border-kumo-border-primary bg-kumo-bg-elevated">
      <button
        className="w-full text-left p-4 flex items-center gap-3"
        onClick={onToggle}
      >
        <StatusBadge status={project.status} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-kumo-text-primary truncate">
            {project.title}
          </div>
          {project.steps.length > 0 && (
            <div className="text-xs text-kumo-text-secondary">
              {doneCount} / {project.steps.length} steps
            </div>
          )}
        </div>
        <span className="text-kumo-text-tertiary text-sm">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-kumo-border-primary p-4 space-y-3">
          <div className="flex gap-2">
            <select
              className="kumo-input text-sm"
              value={project.status}
              onChange={(e) =>
                agent.call("updateProject", [{
                  id: project.id,
                  status: e.target.value as Project["status"],
                }])
              }
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <button
              className="ml-auto text-sm text-kumo-text-danger hover:underline"
              onClick={async () => {
                if (confirm(`Delete "${project.title}"?`)) {
                  await agent.call("deleteProject", [project.id]);
                }
              }}
            >
              Delete project
            </button>
          </div>

          <div>
            <div className="text-xs uppercase text-kumo-text-tertiary mb-2">
              Steps
            </div>
            <div className="space-y-1">
              {project.steps.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 group"
                >
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={() =>
                      agent.call("toggleStep", [{
                        projectId: project.id,
                        stepId: s.id,
                      }])
                    }
                  />
                  <span
                    className={`flex-1 text-sm ${
                      s.done
                        ? "line-through text-kumo-text-tertiary"
                        : "text-kumo-text-primary"
                    }`}
                  >
                    {s.text}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-xs text-kumo-text-danger"
                    onClick={() =>
                      agent.call("deleteStep", [{
                        projectId: project.id,
                        stepId: s.id,
                      }])
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="kumo-input flex-1 text-sm"
                placeholder="Add a step"
                value={stepText}
                onChange={(e) => setStepText(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && stepText.trim()) {
                    await agent.call("addStep", [{
                      projectId: project.id,
                      text: stepText,
                    }]);
                    setStepText("");
                  }
                }}
              />
            </div>
          </div>

          {parts.length > 0 && (
            <div>
              <div className="text-xs uppercase text-kumo-text-tertiary mb-2">
                Parts
              </div>
              <div className="flex flex-wrap gap-1">
                {parts.map((p) => {
                  const linked = project.partIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() =>
                        agent.call(linked ? "unlinkPart" : "linkPart", [{
                          projectId: project.id,
                          partId: p.id,
                        }])
                      }
                      className={`text-xs px-2 py-1 rounded border ${
                        linked
                          ? "bg-kumo-bg-brand text-kumo-text-on-brand border-transparent"
                          : "border-kumo-border-primary text-kumo-text-secondary hover:text-kumo-text-primary"
                      }`}
                    >
                      {linked ? "✓ " : "+ "}
                      {p.name}
                    </button>
                  );
                })}
              </div>
              {linkedParts.length === 0 && parts.length > 0 && (
                <div className="text-xs text-kumo-text-tertiary mt-1">
                  Click a part to link it
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const color =
    status === "done"
      ? "bg-green-500/20 text-green-400"
      : status === "in_progress"
      ? "bg-yellow-500/20 text-yellow-400"
      : "bg-gray-500/20 text-gray-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
      {status === "in_progress" ? "active" : status}
    </span>
  );
}

// ---------- Parts ----------

function PartsTab({
  agent,
  parts,
}: {
  agent: { call: (m: string, args?: unknown) => Promise<unknown> };
  parts: Part[];
}) {
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [qty, setQty] = useState(1);

  const add = async () => {
    if (!name.trim()) return;
    await agent.call("addPart", [{
      name,
      partNumber: partNumber || undefined,
      quantity: qty,
    }]);
    setName("");
    setPartNumber("");
    setQty(1);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_80px_auto] gap-2">
        <input
          className="kumo-input"
          placeholder="Part name (e.g. 'Front brake pads')"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          className="kumo-input"
          placeholder="Part #"
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          type="number"
          className="kumo-input"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value) || 1)}
          min={1}
        />
        <button
          className="px-4 py-2 rounded-lg bg-kumo-bg-brand text-kumo-text-on-brand font-medium disabled:opacity-50"
          disabled={!name.trim()}
          onClick={add}
        >
          Add
        </button>
      </div>

      {parts.length === 0 && (
        <div className="text-kumo-text-secondary py-8 text-center">
          No parts logged yet.
        </div>
      )}

      <div className="space-y-1">
        {parts.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-kumo-border-primary bg-kumo-bg-elevated group"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-kumo-text-primary">{p.name}</div>
              <div className="text-xs text-kumo-text-secondary flex gap-3">
                {p.partNumber && <span>PN: {p.partNumber}</span>}
                <span>Qty: {p.quantity}</span>
                {p.source && <span>{p.source}</span>}
              </div>
            </div>
            <button
              className="opacity-0 group-hover:opacity-100 text-sm text-kumo-text-danger"
              onClick={async () => {
                if (confirm(`Delete "${p.name}"?`)) {
                  await agent.call("deletePart", [p.id]);
                }
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Maintenance ----------

function MaintenanceTab({
  agent,
  entries,
}: {
  agent: { call: (m: string, args?: unknown) => Promise<unknown> };
  entries: MaintenanceEntry[];
}) {
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [mileage, setMileage] = useState<string>("");

  const add = async () => {
    if (!type.trim() || !notes.trim()) return;
    await agent.call("addMaintenance", [{
      type,
      notes,
      mileage: mileage ? parseInt(mileage) : undefined,
    }]);
    setType("");
    setNotes("");
    setMileage("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-kumo-border-primary bg-kumo-bg-elevated p-4 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
          <input
            className="kumo-input"
            placeholder="Type (e.g. 'Oil change', 'Brake service')"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <input
            className="kumo-input"
            placeholder="Mileage"
            value={mileage}
            onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <textarea
          className="kumo-input min-h-[60px]"
          placeholder="Notes — what was done, parts used, observations…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-kumo-bg-brand text-kumo-text-on-brand font-medium disabled:opacity-50"
            disabled={!type.trim() || !notes.trim()}
            onClick={add}
          >
            Log entry
          </button>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="text-kumo-text-secondary py-8 text-center">
          No maintenance logged yet.
        </div>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <div
            key={e.id}
            className="p-3 rounded-lg border border-kumo-border-primary bg-kumo-bg-elevated group"
          >
            <div className="flex items-baseline gap-3">
              <div className="font-medium text-kumo-text-primary">{e.type}</div>
              <div className="text-xs text-kumo-text-secondary">
                {new Date(e.date).toLocaleDateString()}
                {e.mileage && ` · ${e.mileage.toLocaleString()} mi`}
              </div>
              <button
                className="ml-auto opacity-0 group-hover:opacity-100 text-xs text-kumo-text-danger"
                onClick={() => agent.call("deleteMaintenance", [e.id])}
              >
                Delete
              </button>
            </div>
            <div className="text-sm text-kumo-text-secondary mt-1 whitespace-pre-wrap">
              {e.notes}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Info ----------

function InfoTab({
  agent,
  info,
}: {
  agent: { call: (m: string, args?: unknown) => Promise<unknown> };
  info: VehicleState["info"];
}) {
  const [mileage, setMileage] = useState(info?.mileage?.toString() ?? "");
  if (!info) return <div>Loading…</div>;

  return (
    <div className="space-y-3 max-w-md">
      <Row label="Year" value={info.year.toString()} />
      <Row label="Make" value={info.make} />
      <Row label="Model" value={info.model} />
      {info.nickname && <Row label="Nickname" value={info.nickname} />}
      {info.vin && <Row label="VIN" value={info.vin} />}
      <div className="flex items-center gap-2">
        <div className="w-24 text-sm text-kumo-text-secondary">Mileage</div>
        <input
          className="kumo-input flex-1"
          placeholder="Current mileage"
          value={mileage}
          onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            const n = parseInt(mileage);
            if (!isNaN(n)) agent.call("updateMileage", [n]);
          }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 text-sm text-kumo-text-secondary">{label}</div>
      <div className="text-kumo-text-primary">{value}</div>
    </div>
  );
}
