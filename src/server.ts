import { routeAgentRequest } from "agents";

export { GarageAgent } from "./agents/garage";
export { VehicleAgent } from "./agents/vehicle";
export { ToolboxAgent } from "./agents/toolbox";

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  },
};
