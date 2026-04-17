import { Agent, callable, getAgentByName } from "agents";

export type VehicleIdentity = {
  year: number | null;
  make: string;
  model: string;
  nickname: string | null;
  color: string;
  icon: string;
  vin: string | null;
};

export type ProjectStatus = "planned" | "active" | "stalled" | "done";
export type PartStatus = "need" | "ordered" | "on-hand" | "installed";

export type ProjectSummary = {
  id: string;
  title: string;
  status: ProjectStatus;
  module: string;
  updated_at: number;
};

export type VehicleState = {
  identity: VehicleIdentity;
  projects: ProjectSummary[];
  activeProjectId: string | null;
};

export type Step = {
  id: number;
  project_id: string;
  sort_order: number;
  text: string;
  done: 0 | 1;
  completed_at: number | null;
  notes: string | null;
};

export type Part = {
  id: number;
  project_id: string;
  name: string;
  part_number: string | null;
  status: PartStatus;
  cost: number | null;
  source: string | null;
  notes: string | null;
};

export type ProjectRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  module: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

export type ProjectDetail = ProjectRow & {
  steps: Step[];
  parts: Part[];
};

const defaultIdentity: VehicleIdentity = {
  year: null,
  make: "",
  model: "",
  nickname: null,
  color: "#888888",
  icon: "🚗",
  vin: null,
};

export class VehicleAgent extends Agent<Env, VehicleState> {
  initialState: VehicleState = {
    identity: defaultIdentity,
    projects: [],
    activeProjectId: null,
  };

  onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned'
          CHECK(status IN ('planned','active','stalled','done')),
        module TEXT NOT NULL DEFAULT 'general',
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        text TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER,
        notes TEXT
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        part_number TEXT,
        status TEXT NOT NULL DEFAULT 'need'
          CHECK(status IN ('need','ordered','on-hand','installed')),
        cost REAL,
        source TEXT,
        notes TEXT
      )
    `;
    this.sql`CREATE INDEX IF NOT EXISTS idx_steps_project ON steps(project_id, sort_order)`;
    this.sql`CREATE INDEX IF NOT EXISTS idx_parts_project ON parts(project_id)`;

    this.refreshProjectList();
  }

  private refreshProjectList() {
    const rows = this.sql<ProjectSummary>`
      SELECT id, title, status, module, updated_at
      FROM projects
      ORDER BY updated_at DESC
    `;
    this.setState({ ...this.state, projects: rows });
  }

  private touchProject(id: string) {
    this.sql`UPDATE projects SET updated_at = unixepoch() WHERE id = ${id}`;
  }

  @callable()
  async setIdentity(patch: Partial<VehicleIdentity>): Promise<VehicleIdentity> {
    const next = { ...this.state.identity, ...patch };
    this.setState({ ...this.state, identity: next });
    const touched = (
      ["year", "make", "model", "nickname", "color", "icon"] as const
    ).some((k) => k in patch);
    if (touched && this.name) {
      const garage = await getAgentByName(this.env.GARAGE_AGENT, "default");
      await garage.updateVehicleListing(this.name, {
        year: next.year,
        make: next.make,
        model: next.model,
        nickname: next.nickname,
        color: next.color,
        icon: next.icon,
      });
    }
    return next;
  }

  @callable()
  purge(): void {
    this.ctx.storage.deleteAll();
  }

  @callable()
  setActiveProject(projectId: string | null): void {
    this.setState({ ...this.state, activeProjectId: projectId });
  }

  @callable()
  createProject(input: {
    title: string;
    module?: string;
    notes?: string;
  }): ProjectSummary {
    const id = crypto.randomUUID();
    const module = input.module ?? "general";
    this.sql`
      INSERT INTO projects (id, title, module, notes)
      VALUES (${id}, ${input.title}, ${module}, ${input.notes ?? null})
    `;
    const [row] = this.sql<ProjectSummary>`
      SELECT id, title, status, module, updated_at
      FROM projects WHERE id = ${id}
    `;
    this.refreshProjectList();
    return row;
  }

  @callable()
  updateProject(
    id: string,
    patch: {
      title?: string;
      status?: ProjectStatus;
      module?: string;
      notes?: string;
    }
  ): void {
    if (patch.title !== undefined)
      this.sql`UPDATE projects SET title = ${patch.title} WHERE id = ${id}`;
    if (patch.status !== undefined)
      this.sql`UPDATE projects SET status = ${patch.status} WHERE id = ${id}`;
    if (patch.module !== undefined)
      this.sql`UPDATE projects SET module = ${patch.module} WHERE id = ${id}`;
    if (patch.notes !== undefined)
      this.sql`UPDATE projects SET notes = ${patch.notes} WHERE id = ${id}`;
    this.touchProject(id);
    this.refreshProjectList();
  }

  @callable()
  deleteProject(id: string): void {
    this.sql`DELETE FROM steps WHERE project_id = ${id}`;
    this.sql`DELETE FROM parts WHERE project_id = ${id}`;
    this.sql`DELETE FROM projects WHERE id = ${id}`;
    const activeProjectId =
      this.state.activeProjectId === id ? null : this.state.activeProjectId;
    this.setState({ ...this.state, activeProjectId });
    this.refreshProjectList();
  }

  @callable()
  getProject(id: string): ProjectDetail | null {
    const [project] = this.sql<ProjectRow>`
      SELECT * FROM projects WHERE id = ${id}
    `;
    if (!project) return null;
    const steps = this.sql<Step>`
      SELECT * FROM steps WHERE project_id = ${id} ORDER BY sort_order ASC
    `;
    const parts = this.sql<Part>`
      SELECT * FROM parts WHERE project_id = ${id}
    `;
    return { ...project, steps, parts };
  }

  @callable()
  addStep(projectId: string, text: string): Step {
    const [{ next_order }] = this.sql<{ next_order: number }>`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
      FROM steps WHERE project_id = ${projectId}
    `;
    const [row] = this.sql<Step>`
      INSERT INTO steps (project_id, sort_order, text)
      VALUES (${projectId}, ${next_order}, ${text})
      RETURNING *
    `;
    this.touchProject(projectId);
    this.refreshProjectList();
    return row;
  }

  @callable()
  toggleStep(stepId: number): void {
    const [row] = this.sql<{ project_id: string; done: 0 | 1 }>`
      SELECT project_id, done FROM steps WHERE id = ${stepId}
    `;
    if (!row) return;
    if (row.done) {
      this.sql`UPDATE steps SET done = 0, completed_at = NULL WHERE id = ${stepId}`;
    } else {
      this.sql`UPDATE steps SET done = 1, completed_at = unixepoch() WHERE id = ${stepId}`;
    }
    this.touchProject(row.project_id);
    this.refreshProjectList();
  }

  @callable()
  updateStep(stepId: number, patch: { text?: string; notes?: string }): void {
    const [row] = this.sql<{ project_id: string }>`
      SELECT project_id FROM steps WHERE id = ${stepId}
    `;
    if (!row) return;
    if (patch.text !== undefined)
      this.sql`UPDATE steps SET text = ${patch.text} WHERE id = ${stepId}`;
    if (patch.notes !== undefined)
      this.sql`UPDATE steps SET notes = ${patch.notes} WHERE id = ${stepId}`;
    this.touchProject(row.project_id);
  }

  @callable()
  reorderSteps(projectId: string, orderedIds: number[]): void {
    for (let i = 0; i < orderedIds.length; i++) {
      this.sql`
        UPDATE steps SET sort_order = ${i}
        WHERE id = ${orderedIds[i]} AND project_id = ${projectId}
      `;
    }
    this.touchProject(projectId);
  }

  @callable()
  deleteStep(stepId: number): void {
    const [row] = this.sql<{ project_id: string }>`
      SELECT project_id FROM steps WHERE id = ${stepId}
    `;
    if (!row) return;
    this.sql`DELETE FROM steps WHERE id = ${stepId}`;
    this.touchProject(row.project_id);
  }

  @callable()
  addPart(
    projectId: string,
    input: {
      name: string;
      part_number?: string;
      cost?: number;
      source?: string;
      notes?: string;
    }
  ): Part {
    const [row] = this.sql<Part>`
      INSERT INTO parts (project_id, name, part_number, cost, source, notes)
      VALUES (
        ${projectId},
        ${input.name},
        ${input.part_number ?? null},
        ${input.cost ?? null},
        ${input.source ?? null},
        ${input.notes ?? null}
      )
      RETURNING *
    `;
    this.touchProject(projectId);
    this.refreshProjectList();
    return row;
  }

  @callable()
  updatePart(
    partId: number,
    patch: {
      name?: string;
      part_number?: string;
      status?: PartStatus;
      cost?: number;
      source?: string;
      notes?: string;
    }
  ): void {
    const [row] = this.sql<{ project_id: string }>`
      SELECT project_id FROM parts WHERE id = ${partId}
    `;
    if (!row) return;
    if (patch.name !== undefined)
      this.sql`UPDATE parts SET name = ${patch.name} WHERE id = ${partId}`;
    if (patch.part_number !== undefined)
      this.sql`UPDATE parts SET part_number = ${patch.part_number} WHERE id = ${partId}`;
    if (patch.status !== undefined)
      this.sql`UPDATE parts SET status = ${patch.status} WHERE id = ${partId}`;
    if (patch.cost !== undefined)
      this.sql`UPDATE parts SET cost = ${patch.cost} WHERE id = ${partId}`;
    if (patch.source !== undefined)
      this.sql`UPDATE parts SET source = ${patch.source} WHERE id = ${partId}`;
    if (patch.notes !== undefined)
      this.sql`UPDATE parts SET notes = ${patch.notes} WHERE id = ${partId}`;
    this.touchProject(row.project_id);
  }

  @callable()
  deletePart(partId: number): void {
    const [row] = this.sql<{ project_id: string }>`
      SELECT project_id FROM parts WHERE id = ${partId}
    `;
    if (!row) return;
    this.sql`DELETE FROM parts WHERE id = ${partId}`;
    this.touchProject(row.project_id);
  }
}
