import { Agent, callable } from "agents";

export type VehicleInfo = {
  make: string;
  model: string;
  year: number;
  nickname?: string;
  vin?: string;
  mileage?: number;
};

export type Step = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

export type Project = {
  id: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "done";
  steps: Step[];
  partIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type Part = {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  cost?: number;
  source?: string;
  notes?: string;
  createdAt: number;
};

export type MaintenanceEntry = {
  id: string;
  type: string;
  notes: string;
  mileage?: number;
  date: number;
  createdAt: number;
};

export type VehicleState = {
  info: VehicleInfo | null;
  projects: Project[];
  parts: Part[];
  maintenance: MaintenanceEntry[];
};

export class VehicleAgent extends Agent<Env, VehicleState> {
  initialState: VehicleState = {
    info: null,
    projects: [],
    parts: [],
    maintenance: [],
  };

  // --- Info ---
  @callable()
  setInfo(info: VehicleInfo) {
    this.setState({ ...this.state, info });
  }

  @callable()
  updateMileage(mileage: number) {
    if (!this.state.info) return;
    this.setState({
      ...this.state,
      info: { ...this.state.info, mileage },
    });
  }

  // --- Projects ---
  @callable()
  addProject(input: { title: string; description?: string }) {
    const now = Date.now();
    const project: Project = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      status: "open",
      steps: [],
      partIds: [],
      createdAt: now,
      updatedAt: now,
    };
    this.setState({
      ...this.state,
      projects: [project, ...this.state.projects],
    });
    return project;
  }

  @callable()
  updateProject(input: {
    id: string;
    title?: string;
    description?: string;
    status?: Project["status"];
  }) {
    this.setState({
      ...this.state,
      projects: this.state.projects.map((p) =>
        p.id === input.id
          ? {
              ...p,
              title: input.title?.trim() ?? p.title,
              description: input.description?.trim() ?? p.description,
              status: input.status ?? p.status,
              updatedAt: Date.now(),
            }
          : p
      ),
    });
  }

  @callable()
  deleteProject(id: string) {
    this.setState({
      ...this.state,
      projects: this.state.projects.filter((p) => p.id !== id),
    });
  }

  @callable()
  addStep(input: { projectId: string; text: string }) {
    const step: Step = {
      id: crypto.randomUUID(),
      text: input.text.trim(),
      done: false,
      createdAt: Date.now(),
    };
    this.setState({
      ...this.state,
      projects: this.state.projects.map((p) =>
        p.id === input.projectId
          ? { ...p, steps: [...p.steps, step], updatedAt: Date.now() }
          : p
      ),
    });
    return step;
  }

  @callable()
  toggleStep(input: { projectId: string; stepId: string }) {
    this.setState({
      ...this.state,
      projects: this.state.projects.map((p) =>
        p.id === input.projectId
          ? {
              ...p,
              steps: p.steps.map((s) =>
                s.id === input.stepId ? { ...s, done: !s.done } : s
              ),
              updatedAt: Date.now(),
            }
          : p
      ),
    });
  }

  @callable()
  deleteStep(input: { projectId: string; stepId: string }) {
    this.setState({
      ...this.state,
      projects: this.state.projects.map((p) =>
        p.id === input.projectId
          ? {
              ...p,
              steps: p.steps.filter((s) => s.id !== input.stepId),
              updatedAt: Date.now(),
            }
          : p
      ),
    });
  }

  @callable()
  linkPart(input: { projectId: string; partId: string }) {
    this.setState({
      ...this.state,
      projects: this.state.projects.map((p) =>
        p.id === input.projectId && !p.partIds.includes(input.partId)
          ? { ...p, partIds: [...p.partIds, input.partId], updatedAt: Date.now() }
          : p
      ),
    });
  }

  @callable()
  unlinkPart(input: { projectId: string; partId: string }) {
    this.setState({
      ...this.state,
      projects: this.state.projects.map((p) =>
        p.id === input.projectId
          ? {
              ...p,
              partIds: p.partIds.filter((id) => id !== input.partId),
              updatedAt: Date.now(),
            }
          : p
      ),
    });
  }

  // --- Parts ---
  @callable()
  addPart(input: {
    name: string;
    partNumber?: string;
    quantity?: number;
    cost?: number;
    source?: string;
    notes?: string;
  }) {
    const part: Part = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      partNumber: input.partNumber?.trim() || undefined,
      quantity: input.quantity ?? 1,
      cost: input.cost,
      source: input.source?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: Date.now(),
    };
    this.setState({
      ...this.state,
      parts: [part, ...this.state.parts],
    });
    return part;
  }

  @callable()
  updatePart(input: {
    id: string;
    name?: string;
    partNumber?: string;
    quantity?: number;
    cost?: number;
    source?: string;
    notes?: string;
  }) {
    this.setState({
      ...this.state,
      parts: this.state.parts.map((p) =>
        p.id === input.id
          ? {
              ...p,
              name: input.name?.trim() ?? p.name,
              partNumber: input.partNumber?.trim() ?? p.partNumber,
              quantity: input.quantity ?? p.quantity,
              cost: input.cost ?? p.cost,
              source: input.source?.trim() ?? p.source,
              notes: input.notes?.trim() ?? p.notes,
            }
          : p
      ),
    });
  }

  @callable()
  deletePart(id: string) {
    this.setState({
      ...this.state,
      parts: this.state.parts.filter((p) => p.id !== id),
      // Also unlink from projects
      projects: this.state.projects.map((proj) => ({
        ...proj,
        partIds: proj.partIds.filter((pid) => pid !== id),
      })),
    });
  }

  // --- Maintenance ---
  @callable()
  addMaintenance(input: {
    type: string;
    notes: string;
    mileage?: number;
    date?: number;
  }) {
    const entry: MaintenanceEntry = {
      id: crypto.randomUUID(),
      type: input.type.trim(),
      notes: input.notes.trim(),
      mileage: input.mileage,
      date: input.date ?? Date.now(),
      createdAt: Date.now(),
    };
    this.setState({
      ...this.state,
      maintenance: [entry, ...this.state.maintenance],
    });
    return entry;
  }

  @callable()
  deleteMaintenance(id: string) {
    this.setState({
      ...this.state,
      maintenance: this.state.maintenance.filter((m) => m.id !== id),
    });
  }
}
