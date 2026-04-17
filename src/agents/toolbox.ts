import { Agent, callable } from "agents";

export type Tool = {
  id: string;
  name: string;
  category?: string;
  location?: string;
  notes?: string;
  addedAt: number;
};

export type ToolboxState = {
  tools: Tool[];
};

export class ToolboxAgent extends Agent<Env, ToolboxState> {
  initialState: ToolboxState = {
    tools: [],
  };

  @callable()
  addTool(input: {
    name: string;
    category?: string;
    location?: string;
    notes?: string;
  }) {
    const tool: Tool = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      category: input.category?.trim() || undefined,
      location: input.location?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      addedAt: Date.now(),
    };
    this.setState({
      ...this.state,
      tools: [tool, ...this.state.tools],
    });
    return tool;
  }

  @callable()
  updateTool(input: {
    id: string;
    name?: string;
    category?: string;
    location?: string;
    notes?: string;
  }) {
    this.setState({
      ...this.state,
      tools: this.state.tools.map((t) =>
        t.id === input.id
          ? {
              ...t,
              name: input.name?.trim() ?? t.name,
              category: input.category?.trim() ?? t.category,
              location: input.location?.trim() ?? t.location,
              notes: input.notes?.trim() ?? t.notes,
            }
          : t
      ),
    });
  }

  @callable()
  deleteTool(id: string) {
    this.setState({
      ...this.state,
      tools: this.state.tools.filter((t) => t.id !== id),
    });
  }
}
