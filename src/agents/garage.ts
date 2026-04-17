import { Agent, callable } from "agents";

export type VehicleRef = {
  id: string;
  make: string;
  model: string;
  year: number;
  nickname?: string;
  addedAt: number;
};

export type GarageState = {
  vehicles: VehicleRef[];
  activeVehicleId: string | null;
  createdAt: number;
};

export class GarageAgent extends Agent<Env, GarageState> {
  initialState: GarageState = {
    vehicles: [],
    activeVehicleId: null,
    createdAt: Date.now(),
  };

  @callable()
  addVehicle(input: { make: string; model: string; year: number; nickname?: string }) {
    const id = crypto.randomUUID();
    const ref: VehicleRef = {
      id,
      make: input.make.trim(),
      model: input.model.trim(),
      year: input.year,
      nickname: input.nickname?.trim() || undefined,
      addedAt: Date.now(),
    };
    this.setState({
      ...this.state,
      vehicles: [...this.state.vehicles, ref],
      activeVehicleId: this.state.activeVehicleId ?? id,
    });
    return ref;
  }

  @callable()
  removeVehicle(id: string) {
    const remaining = this.state.vehicles.filter((v) => v.id !== id);
    this.setState({
      ...this.state,
      vehicles: remaining,
      activeVehicleId:
        this.state.activeVehicleId === id
          ? remaining[0]?.id ?? null
          : this.state.activeVehicleId,
    });
  }

  @callable()
  renameVehicle(input: { id: string; nickname?: string }) {
    this.setState({
      ...this.state,
      vehicles: this.state.vehicles.map((v) =>
        v.id === input.id ? { ...v, nickname: input.nickname?.trim() || undefined } : v
      ),
    });
  }

  @callable()
  setActiveVehicle(id: string | null) {
    this.setState({ ...this.state, activeVehicleId: id });
  }
}
