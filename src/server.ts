import { Agent, routeAgentRequest, callable, getAgentByName } from "agents";
import type { VehicleIdentity } from "./vehicle-agent";

export { VehicleAgent } from "./vehicle-agent";
export type {
  VehicleIdentity,
  VehicleState,
  ProjectStatus,
  PartStatus,
  ProjectSummary,
  ProjectDetail,
  ProjectRow,
  Step,
  Part,
} from "./vehicle-agent";

export type VehicleListing = {
  id: string;
  year: number | null;
  make: string;
  model: string;
  nickname: string | null;
  color: string;
  icon: string;
  created_at: number;
};

export type GarageState = {
  vehicles: VehicleListing[];
};

export type AddVehicleInput = {
  year?: number | null;
  make: string;
  model: string;
  nickname?: string | null;
  color?: string;
  icon?: string;
};

export class GarageAgent extends Agent<Env, GarageState> {
  initialState: GarageState = {
    vehicles: [],
  };

  @callable()
  async addVehicle(input: AddVehicleInput): Promise<VehicleListing> {
    console.log("addVehicle:start", JSON.stringify(input));
    const id = crypto.randomUUID();
    const listing: VehicleListing = {
      id,
      year: input.year ?? null,
      make: input.make.trim(),
      model: input.model.trim(),
      nickname: input.nickname?.trim() || null,
      color: input.color ?? "#888888",
      icon: input.icon ?? "🚗",
      created_at: Math.floor(Date.now() / 1000),
    };

    const identity: VehicleIdentity = {
      year: listing.year,
      make: listing.make,
      model: listing.model,
      nickname: listing.nickname,
      color: listing.color,
      icon: listing.icon,
      vin: null,
    };
    console.log("addVehicle:got-id", id);
    const stub = await getAgentByName(this.env.VEHICLE_AGENT, id);
    console.log("addVehicle:got-stub");
    try {
      await stub.seedIdentity(identity);
      console.log("addVehicle:seeded-identity");
    } catch (err) {
      console.error("addVehicle:seed-failed", err instanceof Error ? err.message : String(err));
      throw err;
    }

    this.setState({
      ...this.state,
      vehicles: [listing, ...this.state.vehicles],
    });
    console.log("addVehicle:done", id);
    return listing;
  }

  @callable()
  async removeVehicle(id: string): Promise<void> {
    const stub = await getAgentByName(this.env.VEHICLE_AGENT, id);
    await stub.purge();
    this.setState({
      ...this.state,
      vehicles: this.state.vehicles.filter((v) => v.id !== id),
    });
  }

  @callable()
  updateVehicleListing(
    id: string,
    patch: Partial<Omit<VehicleListing, "id" | "created_at">>
  ): void {
    this.setState({
      ...this.state,
      vehicles: this.state.vehicles.map((v) =>
        v.id === id ? { ...v, ...patch } : v
      ),
    });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  },
};
