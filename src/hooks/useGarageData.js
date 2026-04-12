import { useState, useEffect, useCallback } from "react";
import * as api from "../api.js";

// Seed data — used when API is empty or unavailable (local dev without D1)
import { SEED_VEHICLES } from "../seed.js";

export default function useGarageData() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingLocal, setUsingLocal] = useState(false);

  // Load vehicles + their projects from API
  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const vList = await api.fetchVehicles();
      if (vList.length === 0) {
        // D1 is empty — use seed data so the app isn't blank
        setVehicles(SEED_VEHICLES);
        setUsingLocal(true);
        setLoading(false);
        return;
      }

      // Enrich each vehicle with its projects from D1
      const enriched = await Promise.all(
        vList.map(async (v) => {
          let projects = [];
          try {
            projects = await api.fetchProjects(v.id);
          } catch {
            // API failed for this vehicle
          }

          // If D1 has no projects for this vehicle, merge in seed data.
          // This preserves the pre-built troubleshooting trees, repair guides,
          // parts/tools lists — the core data that makes the app useful.
          // Match by year + make since D1 IDs differ from seed IDs.
          if (projects.length === 0) {
            const seedVehicle = SEED_VEHICLES.find(
              sv => sv.year === v.year && sv.make === v.make
            );
            if (seedVehicle?.projects) {
              projects = seedVehicle.projects.map(p => ({
                ...p,
                vehicle_id: v.id,  // Remap to D1 vehicle ID
              }));
            }
          }

          return { ...v, projects };
        })
      );

      setVehicles(enriched);
      setUsingLocal(false);
    } catch (e) {
      console.warn("API unavailable, using seed data:", e.message);
      setVehicles(SEED_VEHICLES);
      setUsingLocal(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  // --- Mutations ---

  const addVehicle = useCallback(async (vehicleData) => {
    if (usingLocal) {
      const id = `${vehicleData.make}-${vehicleData.model}-${vehicleData.year}`.toLowerCase().replace(/\s+/g, '-');
      const newVehicle = { id, ...vehicleData, projects: [] };
      setVehicles(prev => [...prev, newVehicle]);
      return newVehicle;
    }

    const { id } = await api.createVehicle(vehicleData);
    const newVehicle = { id, ...vehicleData, projects: [] };
    setVehicles(prev => [...prev, newVehicle]);
    return newVehicle;
  }, [usingLocal]);

  const addProject = useCallback(async (vehicleId, projectData) => {
    if (usingLocal) {
      const id = `${vehicleId}-${Date.now()}`;
      const newProject = {
        ...projectData, id,
        vehicle_id: vehicleId,
        created: new Date().toISOString().split("T")[0],
        steps: projectData.steps || [],
        parts: projectData.parts || [],
        tools: projectData.tools || [],
        fsmSections: projectData.fsmSections || [],
      };
      setVehicles(prev => prev.map(v =>
        v.id === vehicleId ? { ...v, projects: [...v.projects, newProject] } : v
      ));
      return newProject;
    }

    const { id } = await api.createProject({
      vehicle_id: vehicleId,
      title: projectData.title,
      module: projectData.module,
      status: projectData.status || "planned",
      notes: projectData.notes,
    });
    const newProject = {
      ...projectData, id, vehicle_id: vehicleId,
      steps: [], parts: [], tools: [], fsmSections: [],
    };
    setVehicles(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, projects: [...v.projects, newProject] } : v
    ));
    return newProject;
  }, [usingLocal]);

  const toggleStep = useCallback(async (vehicleId, projectId, stepIdx) => {
    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        projects: v.projects.map(p => {
          if (p.id !== projectId) return p;
          const newSteps = [...p.steps];
          const step = newSteps[stepIdx];
          newSteps[stepIdx] = { ...step, done: !step.done };

          // Fire API call in background (don't block UI)
          if (!usingLocal && step.id != null) {
            api.toggleStep(step.id, !step.done).catch(console.error);
          }

          return { ...p, steps: newSteps, updated: new Date().toISOString().split("T")[0] };
        }),
      };
    }));
  }, [usingLocal]);

  const addNote = useCallback(async (vehicleId, projectId, note) => {
    const ts = new Date().toLocaleString();
    const formatted = `\n\n[${ts}] ${note}`;

    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        projects: v.projects.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, notes: (p.notes || "") + formatted };
        }),
      };
    }));

    if (!usingLocal) {
      api.addJournalEntry(projectId, note).catch(console.error);
      api.updateProject(projectId, {
        notes: null, // The full notes field will be synced on next load
      }).catch(() => {});
    }
  }, [usingLocal]);

  const updateProjectStatus = useCallback(async (vehicleId, projectId, status) => {
    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        projects: v.projects.map(p =>
          p.id === projectId ? { ...p, status } : p
        ),
      };
    }));

    if (!usingLocal) {
      api.updateProject(projectId, { status }).catch(console.error);
    }
  }, [usingLocal]);

  // Get a fresh reference to a specific vehicle/project from current state
  const getVehicle = useCallback((id) => vehicles.find(v => v.id === id), [vehicles]);
  const getProject = useCallback((vehicleId, projectId) => {
    const v = vehicles.find(v => v.id === vehicleId);
    return v?.projects?.find(p => p.id === projectId);
  }, [vehicles]);

  return {
    vehicles,
    loading,
    error,
    usingLocal,
    addVehicle,
    addProject,
    toggleStep,
    addNote,
    updateProjectStatus,
    getVehicle,
    getProject,
    reload: loadVehicles,
  };
}
