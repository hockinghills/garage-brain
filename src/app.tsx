import { useEffect, useState } from "react";
import { useAgent } from "agents/react";
import type {
  GarageState,
  VehicleIdentity,
  VehicleState,
  ProjectDetail,
  ProjectStatus,
  PartStatus,
} from "./server";

type Route =
  | { kind: "garage" }
  | { kind: "vehicle"; id: string }
  | { kind: "project"; vehicleId: string; projectId: string };

function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "").replace(/^\//, "");
  if (!h) return { kind: "garage" };
  const parts = h.split("/");
  if (parts[0] === "v" && parts[1]) {
    if (parts[2] === "p" && parts[3]) {
      return { kind: "project", vehicleId: parts[1], projectId: parts[3] };
    }
    return { kind: "vehicle", id: parts[1] };
  }
  return { kind: "garage" };
}

function toHash(route: Route): string {
  if (route.kind === "garage") return "#/";
  if (route.kind === "vehicle") return `#/v/${route.id}`;
  return `#/v/${route.vehicleId}/p/${route.projectId}`;
}

function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = (r: Route) => {
    const h = toHash(r);
    if (location.hash !== h) location.hash = h;
    else setRoute(r);
  };
  return [route, navigate];
}

export default function App() {
  const [route, setRoute] = useHashRoute();

  return (
    <div className="min-h-screen bg-kumo-bg-page text-kumo-text-primary">
      <header className="border-b border-kumo-border-subtle px-6 py-3 flex items-center gap-3">
        <button
          className="text-left"
          onClick={() => setRoute({ kind: "garage" })}
        >
          <span className="text-xl font-semibold">Garage Brain</span>
        </button>
        {route.kind !== "garage" && (
          <button
            className="text-kumo-text-secondary hover:text-kumo-text-primary text-sm"
            onClick={() => setRoute({ kind: "garage" })}
          >
            ← Garage
          </button>
        )}
        {route.kind === "project" && (
          <button
            className="text-kumo-text-secondary hover:text-kumo-text-primary text-sm"
            onClick={() =>
              setRoute({ kind: "vehicle", id: route.vehicleId })
            }
          >
            ← Vehicle
          </button>
        )}
      </header>
      <main className="p-6 max-w-4xl mx-auto">
        {route.kind === "garage" && <GarageView onOpen={setRoute} />}
        {route.kind === "vehicle" && (
          <VehicleView vehicleId={route.id} onOpen={setRoute} />
        )}
        {route.kind === "project" && (
          <ProjectView
            vehicleId={route.vehicleId}
            projectId={route.projectId}
          />
        )}
      </main>
    </div>
  );
}

function GarageView({ onOpen }: { onOpen: (r: Route) => void }) {
  const garage = useAgent<GarageState>({ agent: "GarageAgent" });
  const vehicles = garage.state?.vehicles ?? [];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-3">Vehicles</h2>
        {vehicles.length === 0 ? (
          <p className="text-kumo-text-secondary text-sm">
            No vehicles yet. Add one below.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {vehicles.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => onOpen({ kind: "vehicle", id: v.id })}
                  className="w-full text-left p-3 rounded-lg border border-kumo-border-subtle hover:border-kumo-border-strong flex items-center gap-3"
                >
                  <span
                    className="text-2xl w-10 h-10 rounded flex items-center justify-center"
                    style={{ backgroundColor: v.color + "33" }}
                  >
                    {v.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">
                      {v.nickname ||
                        [v.year, v.make, v.model].filter(Boolean).join(" ")}
                    </span>
                    {v.nickname && (
                      <span className="block text-sm text-kumo-text-secondary">
                        {[v.year, v.make, v.model].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-kumo-border-subtle pt-6">
        <h2 className="text-lg font-semibold mb-3">Add a vehicle</h2>
        <AddVehicleForm
          onAdd={async (input) => {
            const listing = await garage.stub.addVehicle(input);
            onOpen({ kind: "vehicle", id: listing.id });
          }}
        />
      </section>
    </div>
  );
}

function AddVehicleForm({
  onAdd,
}: {
  onAdd: (input: {
    year: number | null;
    make: string;
    model: string;
    nickname: string | null;
    color: string;
    icon: string;
  }) => Promise<void>;
}) {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [icon, setIcon] = useState("🚗");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!make.trim() || !model.trim()) return;
        setBusy(true);
        try {
          await onAdd({
            year: year ? Number(year) : null,
            make,
            model,
            nickname: nickname || null,
            color,
            icon,
          });
          setYear("");
          setMake("");
          setModel("");
          setNickname("");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Year">
        <input
          className={inputCls}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          inputMode="numeric"
          placeholder="2015"
        />
      </Field>
      <Field label="Make *">
        <input
          className={inputCls}
          value={make}
          onChange={(e) => setMake(e.target.value)}
          required
          placeholder="Subaru"
        />
      </Field>
      <Field label="Model *">
        <input
          className={inputCls}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
          placeholder="Forester"
        />
      </Field>
      <Field label="Nickname">
        <input
          className={inputCls}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="The blue one"
        />
      </Field>
      <Field label="Color">
        <input
          type="color"
          className="h-10 w-20 rounded border border-kumo-border-subtle"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </Field>
      <Field label="Icon">
        <input
          className={inputCls}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={4}
        />
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className={primaryBtnCls}>
          {busy ? "Adding…" : "Add vehicle"}
        </button>
      </div>
    </form>
  );
}

function VehicleView({
  vehicleId,
  onOpen,
}: {
  vehicleId: string;
  onOpen: (r: Route) => void;
}) {
  const garage = useAgent<GarageState>({ agent: "GarageAgent" });
  const vehicle = useAgent<VehicleState>({
    agent: "VehicleAgent",
    name: vehicleId,
  });
  const identity = vehicle.state?.identity;
  const projects = vehicle.state?.projects ?? [];
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-6">
      <section className="flex items-start gap-4">
        <span
          className="text-4xl w-16 h-16 rounded flex items-center justify-center"
          style={{ backgroundColor: (identity?.color ?? "#888") + "33" }}
        >
          {identity?.icon ?? "🚗"}
        </span>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">
            {identity?.nickname ||
              [identity?.year, identity?.make, identity?.model]
                .filter(Boolean)
                .join(" ") ||
              "Vehicle"}
          </h2>
          {identity?.nickname && (
            <p className="text-kumo-text-secondary">
              {[identity?.year, identity?.make, identity?.model]
                .filter(Boolean)
                .join(" ")}
            </p>
          )}
        </div>
        <button
          className="text-sm text-kumo-text-secondary hover:text-kumo-text-primary"
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          className="text-sm text-kumo-text-danger hover:underline"
          onClick={async () => {
            if (!confirm("Delete vehicle and all of its data? This can't be undone.")) return;
            await garage.stub.removeVehicle(vehicleId);
            onOpen({ kind: "garage" });
          }}
        >
          Delete
        </button>
      </section>

      {editing && identity && (
        <section className="border border-kumo-border-subtle rounded-lg p-4">
          <EditIdentityForm
            identity={identity}
            onSave={async (patch) => {
              await vehicle.stub.setIdentity(patch);
            }}
          />
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Projects</h3>
        </div>
        {projects.length === 0 ? (
          <p className="text-kumo-text-secondary text-sm">No projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() =>
                    onOpen({
                      kind: "project",
                      vehicleId,
                      projectId: p.id,
                    })
                  }
                  className="w-full text-left p-3 rounded-lg border border-kumo-border-subtle hover:border-kumo-border-strong flex items-center justify-between"
                >
                  <span className="font-medium">{p.title}</span>
                  <StatusBadge status={p.status} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const title = String(data.get("title") || "").trim();
            if (!title) return;
            await vehicle.stub.createProject({ title });
            form.reset();
          }}
        >
          <input
            name="title"
            className={inputCls + " flex-1"}
            placeholder="New project — e.g. 'Front brakes'"
          />
          <button type="submit" className={primaryBtnCls}>
            Add
          </button>
        </form>
      </section>
    </div>
  );
}

function ProjectView({
  vehicleId,
  projectId,
}: {
  vehicleId: string;
  projectId: string;
}) {
  const vehicle = useAgent<VehicleState>({
    agent: "VehicleAgent",
    name: vehicleId,
  });
  const [project, setProject] = useState<ProjectDetail | null | undefined>(
    undefined
  );

  // Reload project detail whenever the summary changes (steps/parts mutations
  // bump updated_at via touchProject, which re-broadcasts the project list).
  const summary = vehicle.state?.projects.find((p) => p.id === projectId);
  const version = summary?.updated_at;

  useEffect(() => {
    let cancelled = false;
    vehicle.stub.getProject(projectId).then((p: ProjectDetail | null) => {
      if (!cancelled) setProject(p);
    });
    return () => {
      cancelled = true;
    };
  }, [vehicle, projectId, version]);

  if (project === undefined) {
    return <p className="text-kumo-text-secondary">Loading…</p>;
  }
  if (project === null) {
    return <p className="text-kumo-text-secondary">Project not found.</p>;
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-semibold">{project.title}</h2>
          <StatusSelect
            status={project.status}
            onChange={(status) =>
              vehicle.stub.updateProject(project.id, { status })
            }
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">Steps</h3>
        <ul className="space-y-1">
          {project.steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!s.done}
                onChange={() => vehicle.stub.toggleStep(s.id)}
              />
              <span
                className={s.done ? "line-through text-kumo-text-secondary" : ""}
              >
                {s.text}
              </span>
              <button
                className="ml-auto text-kumo-text-secondary hover:text-kumo-text-danger text-xs"
                onClick={() => vehicle.stub.deleteStep(s.id)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const text = String(data.get("text") || "").trim();
            if (!text) return;
            await vehicle.stub.addStep(project.id, text);
            form.reset();
          }}
        >
          <input
            name="text"
            className={inputCls + " flex-1"}
            placeholder="Add step"
          />
          <button type="submit" className={primaryBtnCls}>
            Add
          </button>
        </form>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">Parts</h3>
        <ul className="space-y-1">
          {project.parts.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <PartStatusSelect
                status={p.status}
                onChange={(status) =>
                  vehicle.stub.updatePart(p.id, { status })
                }
              />
              <span className="flex-1">{p.name}</span>
              {p.part_number && (
                <span className="text-xs text-kumo-text-secondary">
                  {p.part_number}
                </span>
              )}
              <button
                className="text-kumo-text-secondary hover:text-kumo-text-danger text-xs"
                onClick={() => vehicle.stub.deletePart(p.id)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const name = String(data.get("name") || "").trim();
            const part_number =
              String(data.get("part_number") || "").trim() || undefined;
            if (!name) return;
            await vehicle.stub.addPart(project.id, { name, part_number });
            form.reset();
          }}
        >
          <input
            name="name"
            className={inputCls + " flex-1"}
            placeholder="Part name"
          />
          <input
            name="part_number"
            className={inputCls + " w-40"}
            placeholder="Part #"
          />
          <button type="submit" className={primaryBtnCls}>
            Add
          </button>
        </form>
      </section>
    </div>
  );
}

function EditIdentityForm({
  identity,
  onSave,
}: {
  identity: VehicleIdentity;
  onSave: (patch: Partial<VehicleIdentity>) => Promise<void>;
}) {
  const [year, setYear] = useState(identity.year?.toString() ?? "");
  const [make, setMake] = useState(identity.make);
  const [model, setModel] = useState(identity.model);
  const [nickname, setNickname] = useState(identity.nickname ?? "");
  const [color, setColor] = useState(identity.color);
  const [icon, setIcon] = useState(identity.icon);
  const [vin, setVin] = useState(identity.vin ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave({
            year: year ? Number(year) : null,
            make: make.trim(),
            model: model.trim(),
            nickname: nickname.trim() || null,
            color,
            icon,
            vin: vin.trim() || null,
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Year">
        <input
          className={inputCls}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          inputMode="numeric"
        />
      </Field>
      <Field label="Make">
        <input
          className={inputCls}
          value={make}
          onChange={(e) => setMake(e.target.value)}
        />
      </Field>
      <Field label="Model">
        <input
          className={inputCls}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </Field>
      <Field label="Nickname">
        <input
          className={inputCls}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </Field>
      <Field label="Color">
        <input
          type="color"
          className="h-10 w-20 rounded border border-kumo-border-subtle"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </Field>
      <Field label="Icon">
        <input
          className={inputCls}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={4}
        />
      </Field>
      <Field label="VIN">
        <input
          className={inputCls}
          value={vin}
          onChange={(e) => setVin(e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className={primaryBtnCls}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-kumo-text-secondary mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const colors: Record<ProjectStatus, string> = {
    planned: "bg-kumo-bg-subtle text-kumo-text-secondary",
    active: "bg-blue-500/20 text-blue-300",
    stalled: "bg-amber-500/20 text-amber-300",
    done: "bg-green-500/20 text-green-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[status]}`}>
      {status}
    </span>
  );
}

function StatusSelect({
  status,
  onChange,
}: {
  status: ProjectStatus;
  onChange: (s: ProjectStatus) => void;
}) {
  return (
    <select
      className={inputCls}
      value={status}
      onChange={(e) => onChange(e.target.value as ProjectStatus)}
    >
      <option value="planned">planned</option>
      <option value="active">active</option>
      <option value="stalled">stalled</option>
      <option value="done">done</option>
    </select>
  );
}

function PartStatusSelect({
  status,
  onChange,
}: {
  status: PartStatus;
  onChange: (s: PartStatus) => void;
}) {
  return (
    <select
      className={inputCls + " text-xs"}
      value={status}
      onChange={(e) => onChange(e.target.value as PartStatus)}
    >
      <option value="need">need</option>
      <option value="ordered">ordered</option>
      <option value="on-hand">on-hand</option>
      <option value="installed">installed</option>
    </select>
  );
}

const inputCls =
  "px-3 py-2 rounded border border-kumo-border-subtle bg-kumo-bg-surface focus:border-kumo-border-strong focus:outline-none";
const primaryBtnCls =
  "px-4 py-2 rounded-lg bg-kumo-bg-brand text-kumo-text-on-brand disabled:opacity-50";
