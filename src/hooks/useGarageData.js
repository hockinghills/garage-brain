import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api.js";
import { SEED_VEHICLES } from "../seed.js";

// --- localStorage helpers ---
const STORAGE_KEY = "garage-brain-data";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt data — ignore */ }
  return null;
}

function saveToStorage(vehicles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  } catch { /* storage full — ignore */ }
}

export default function useGarageData() {
  const [vehicles, setVehiclesRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingLocal, setUsingLocal] = useState(false);
  const initialLoadDone = useRef(false);

  // Wrap setVehicles to auto-persist
  const setVehicles = useCallback((updater) => {
    setVehiclesRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveToStorage(next);
      return next;
    });
  }, []);

  // Load: localStorage first (instant), then try API to merge
  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Hydrate from localStorage immediately
    const cached = loadFromStorage();
    if (cached && cached.length > 0) {
      setVehiclesRaw(cached);
      setUsingLocal(true);
      setLoading(false);
      initialLoadDone.current = true;
      // Still try API in background to pick up new vehicles
    }

    // 2. If no cache, start with seed data
    if (!cached || cached.length === 0) {
      setVehiclesRaw(SEED_VEHICLES);
      saveToStorage(SEED_VEHICLES);
      setUsingLocal(true);
      setLoading(false);
      initialLoadDone.current = true;
    }

    // 3. Try API — if it responds, merge any new vehicles from D1
    //    but DON'T blow away local project data
    try {
      const vList = await api.fetchVehicles();
      if (vList.length > 0) {
        setVehiclesRaw(prev => {
          const merged = [...prev];
          for (const apiVehicle of vList) {
            const existing = merged.find(v =>
              v.id === apiVehicle.id ||
              (v.year === apiVehicle.year && v.make === apiVehicle.make)
            );
            if (!existing) {
              // New vehicle from D1 we don't have locally — add it
              merged.push({ ...apiVehicle, projects: [] });
            }
            // Don't overwrite local vehicles — local data has the projects
          }
          saveToStorage(merged);
          return merged;
        });
      }
    } catch {
      // API unavailable — that's fine, we have local data
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  // --- Mutations (all persist to localStorage automatically via setVehicles) ---

  const addVehicle = useCallback(async (vehicleData) => {
    const id = `${vehicleData.make}-${vehicleData.model}-${vehicleData.year}`
      .toLowerCase().replace(/\s+/g, '-');
    const newVehicle = { id, ...vehicleData, projects: [] };
    setVehicles(prev => [...prev, newVehicle]);

    // Also try D1
    try { await api.createVehicle(vehicleData); } catch { /* local is fine */ }

    return newVehicle;
  }, [setVehicles]);

  const addProject = useCallback(async (vehicleId, projectData) => {
    const id = `${vehicleId}-${Date.now()}`;
    const newProject = {
      ...projectData, id,
      vehicle_id: vehicleId,
      created_at: new Date().toISOString().split("T")[0],
      steps: projectData.steps || [],
      parts: projectData.parts || [],
      tools: projectData.tools || [],
      fsmSections: projectData.fsmSections || [],
    };
    setVehicles(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, projects: [...(v.projects || []), newProject] } : v
    ));
    return newProject;
  }, [setVehicles]);

  const toggleStep = useCallback((vehicleId, projectId, stepIdx) => {
    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        projects: (v.projects || []).map(p => {
          if (p.id !== projectId) return p;
          const newSteps = [...p.steps];
          newSteps[stepIdx] = { ...newSteps[stepIdx], done: !newSteps[stepIdx].done };
          return { ...p, steps: newSteps, updated_at: new Date().toISOString().split("T")[0] };
        }),
      };
    }));
  }, [setVehicles]);

  const addNote = useCallback((vehicleId, projectId, note) => {
    const ts = new Date().toLocaleString();
    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        projects: (v.projects || []).map(p => {
          if (p.id !== projectId) return p;
          return { ...p, notes: (p.notes || "") + `\n\n[${ts}] ${note}` };
        }),
      };
    }));
  }, [setVehicles]);

  const updateProjectStatus = useCallback((vehicleId, projectId, status) => {
    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        projects: (v.projects || []).map(p =>
          p.id === projectId ? { ...p, status } : p
        ),
      };
    }));
  }, [setVehicles]);

  // Save troubleshooting state back into the project
  const updateTroubleshooting = useCallback((vehicleId, projectId, troubleshootingData) => {
    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        projects: (v.projects || []).map(p => {
          if (p.id !== projectId) return p;
          return { ...p, troubleshooting: { ...p.troubleshooting, ...troubleshootingData } };
        }),
      };
    }));
  }, [setVehicles]);

  const getVehicle = useCallback((id) => vehicles.find(v => v.id === id), [vehicles]);
  const getProject = useCallback((vehicleId, projectId) => {
    const v = vehicles.find(v => v.id === vehicleId);
    return v?.projects?.find(p => p.id === projectId);
  }, [vehicles]);

  // Reset to seed data (dev helper)
  const resetData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setVehiclesRaw(SEED_VEHICLES);
    saveToStorage(SEED_VEHICLES);
  }, []);

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
    updateTroubleshooting,
    getVehicle,
    getProject,
    resetData,
    reload: loadVehicles,
  };
}
