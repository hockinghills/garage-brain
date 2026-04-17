import { useState } from "react";
import type { GarageState, VehicleRef } from "../agents/garage";

type AgentLike = {
  state: GarageState | undefined;
  call: (method: string, args?: unknown) => Promise<unknown>;
};

export function GarageView({
  agent,
  onSelect,
}: {
  agent: AgentLike;
  onSelect: (v: VehicleRef) => void;
}) {
  const vehicles = agent.state?.vehicles ?? [];
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kumo-text-primary">The Garage</h1>
          <p className="text-kumo-text-secondary mt-1">
            {vehicles.length === 0
              ? "No vehicles yet. Add one to get started."
              : `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg bg-kumo-bg-brand text-kumo-text-on-brand font-medium hover:opacity-90"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Cancel" : "+ Add vehicle"}
        </button>
      </div>

      {showForm && (
        <AddVehicleForm
          onSubmit={async (input) => {
            await agent.call("addVehicle", [input]);
            setShowForm(false);
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {vehicles.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            onSelect={() => onSelect(v)}
            onDelete={async () => {
              if (confirm(`Remove ${vehicleLabel(v)}? Its data will remain.`)) {
                await agent.call("removeVehicle", [v.id]);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function VehicleCard({
  vehicle,
  onSelect,
  onDelete,
}: {
  vehicle: VehicleRef;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative rounded-xl border border-kumo-border-primary bg-kumo-bg-elevated p-4 hover:border-kumo-border-accent transition-colors">
      <button
        className="text-left w-full"
        onClick={onSelect}
      >
        <div className="text-lg font-semibold text-kumo-text-primary">
          {vehicle.nickname || vehicleLabel(vehicle)}
        </div>
        {vehicle.nickname && (
          <div className="text-sm text-kumo-text-secondary">
            {vehicleLabel(vehicle)}
          </div>
        )}
        <div className="text-xs text-kumo-text-tertiary mt-2">
          Added {new Date(vehicle.addedAt).toLocaleDateString()}
        </div>
      </button>
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded text-kumo-text-danger hover:bg-kumo-bg-danger-subtle"
        onClick={onDelete}
        aria-label="Remove vehicle"
      >
        Remove
      </button>
    </div>
  );
}

function AddVehicleForm({
  onSubmit,
}: {
  onSubmit: (input: {
    make: string;
    model: string;
    year: number;
    nickname?: string;
  }) => Promise<void>;
}) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = make.trim() && model.trim() && year > 1900;

  return (
    <div className="rounded-xl border border-kumo-border-primary bg-kumo-bg-elevated p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Make">
          <input
            className="kumo-input"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder="Toyota"
          />
        </Field>
        <Field label="Model">
          <input
            className="kumo-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Tacoma"
          />
        </Field>
        <Field label="Year">
          <input
            type="number"
            className="kumo-input"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || 0)}
          />
        </Field>
      </div>
      <Field label="Nickname (optional)">
        <input
          className="kumo-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="The Beast"
        />
      </Field>
      <div className="flex justify-end">
        <button
          className="px-4 py-2 rounded-lg bg-kumo-bg-brand text-kumo-text-on-brand font-medium disabled:opacity-50"
          disabled={!canSubmit || submitting}
          onClick={async () => {
            setSubmitting(true);
            try {
              await onSubmit({
                make,
                model,
                year,
                nickname: nickname || undefined,
              });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Adding…" : "Add vehicle"}
        </button>
      </div>
    </div>
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
    <label className="block text-sm">
      <div className="text-kumo-text-secondary mb-1">{label}</div>
      {children}
    </label>
  );
}

function vehicleLabel(v: VehicleRef) {
  return `${v.year} ${v.make} ${v.model}`;
}
