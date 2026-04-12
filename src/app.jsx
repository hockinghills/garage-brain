import { useState, useCallback } from "react";
import useGarageData from "./hooks/useGarageData.js";
import { css, bg, border, textPri, textDim, accent, font } from "./styles.js";

// Views
import GarageView from "./views/GarageView.jsx";
import VehicleView from "./views/VehicleView.jsx";
import ProjectView from "./views/ProjectView.jsx";
import TroubleshootView from "./views/TroubleshootView.jsx";
import FSMLibraryView from "./views/FSMLibraryView.jsx";
import NewProjectView from "./views/NewProjectView.jsx";
import ModulesView from "./views/ModulesView.jsx";
import SearchView from "./views/SearchView.jsx";

const TABS = [
  { id: "garage", label: "Garage", icon: "🏠" },
  { id: "modules", label: "Modules", icon: "⚙" },
  { id: "search", label: "Search", icon: "🔍" },
];

export default function GarageBrain() {
  const data = useGarageData();
  const { vehicles, loading, usingLocal } = data;

  const [view, setView] = useState("garage");
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [tab, setTab] = useState("garage");

  // Derive current vehicle/project from state
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;
  const selectedProject = selectedVehicle?.projects?.find(p => p.id === selectedProjectId) || null;

  // Navigation
  const goGarage = () => { setView("garage"); setSelectedVehicleId(null); setSelectedProjectId(null); };
  const goVehicle = (v) => { setSelectedVehicleId(v.id); setView("vehicle"); };
  const goProject = (p) => { setSelectedProjectId(p.id); setView("project"); };
  const goBack = (to) => {
    if (to === "vehicle") { setView("vehicle"); setSelectedProjectId(null); }
    else if (to === "project") { setView("project"); }
    else goGarage();
  };

  // Handlers
  const handleToggleStep = useCallback((stepIdx) => {
    if (selectedVehicleId && selectedProjectId) {
      data.toggleStep(selectedVehicleId, selectedProjectId, stepIdx);
    }
  }, [selectedVehicleId, selectedProjectId, data]);

  const handleAddNote = useCallback((note) => {
    if (selectedVehicleId && selectedProjectId) {
      data.addNote(selectedVehicleId, selectedProjectId, note);
    }
  }, [selectedVehicleId, selectedProjectId, data]);

  const handleNewProject = useCallback(async (projectData) => {
    if (selectedVehicleId) {
      await data.addProject(selectedVehicleId, projectData);
      setView("vehicle");
    }
  }, [selectedVehicleId, data]);

  // Render current view
  const renderView = () => {
    if (loading) {
      return (
        <div style={{ ...css.section, padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🧠</div>
          <div style={{ color: textDim, fontSize: 13 }}>Loading garage...</div>
        </div>
      );
    }

    // Tab views (when at garage level)
    if (view === "garage" && tab === "modules") return <ModulesView />;
    if (view === "garage" && tab === "search") return <SearchView />;
    if (view === "garage") return <GarageView vehicles={vehicles} onSelectVehicle={goVehicle} />;

    // Vehicle level
    if (view === "vehicle" && selectedVehicle) {
      return <VehicleView vehicle={selectedVehicle}
        onBack={goGarage} onSelectProject={goProject}
        onNewProject={() => setView("newproject")}
        onOpenFsmLibrary={() => setView("fsm-library")} />;
    }
    if (view === "fsm-library" && selectedVehicle) {
      return <FSMLibraryView vehicle={selectedVehicle} onBack={() => goBack("vehicle")} />;
    }
    if (view === "newproject" && selectedVehicle) {
      return <NewProjectView vehicle={selectedVehicle}
        onBack={() => goBack("vehicle")} onCreate={handleNewProject} />;
    }

    // Project level
    if (view === "project" && selectedVehicle && selectedProject) {
      return <ProjectView vehicle={selectedVehicle} project={selectedProject}
        onBack={() => goBack("vehicle")}
        onToggleStep={handleToggleStep}
        onAddNote={handleAddNote}
        onLaunchTroubleshoot={() => setView("troubleshoot")} />;
    }
    if (view === "troubleshoot" && selectedVehicle && selectedProject) {
      return <TroubleshootView vehicle={selectedVehicle} project={selectedProject}
        onBack={() => goBack("project")} />;
    }

    return null;
  };

  const activeCount = vehicles.reduce(
    (n, v) => n + (v.projects || []).filter(p => p.status === "active").length, 0
  );

  return (
    <div style={css.app}>
      {/* Header */}
      <div style={css.header}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `${accent}15`, border: `1px solid ${accent}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}>🧠</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, color: textPri }}>GARAGE BRAIN</div>
              <div style={{ fontSize: 9, color: textDim, letterSpacing: 3 }}>
                {usingLocal ? "LOCAL MODE" : "CONNECTED"} v0.2
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: textDim, textAlign: "right", lineHeight: 1.5 }}>
            {vehicles.length} vehicles<br />{activeCount} active
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 80 }}>
        {renderView()}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 520,
        background: `${bg}f0`, backdropFilter: "blur(16px)",
        borderTop: `1px solid ${border}`,
        display: "flex", padding: "8px 0", zIndex: 20,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); goGarage(); }} style={{
            flex: 1, background: "none", border: "none",
            color: tab === t.id ? accent : textDim,
            fontSize: 10, fontFamily: font, cursor: "pointer",
            padding: "6px 0", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, fontWeight: tab === t.id ? 700 : 400,
            letterSpacing: 1,
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
