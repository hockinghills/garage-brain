import { Agent, routeAgentRequest, callable } from "agents";

export type GarageState = {
  greeting: string;
  vehicleCount: number;
};

export class GarageAgent extends Agent<Env, GarageState> {
  initialState: GarageState = {
    greeting: "Welcome to the garage.",
    vehicleCount: 0,
  };

  @callable()
  ping() {
    return "Hey. The garage is open.";
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
