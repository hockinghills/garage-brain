-- Garage Brain — D1 Schema
-- Run: npm run db:migrate

-- Vehicles in the garage
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT DEFAULT '#888888',
  icon TEXT DEFAULT '🚗',
  bolt_pattern TEXT,
  obd_protocol TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects per vehicle
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'active', 'stalled', 'done')),
  module TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Steps within a project (ordered procedure)
CREATE TABLE IF NOT EXISTS steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  sort_order INTEGER NOT NULL,
  text TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  completed_at DATETIME,
  notes TEXT
);

-- Parts per project
CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  part_number TEXT,
  status TEXT DEFAULT 'need' CHECK(status IN ('need', 'ordered', 'on-hand', 'installed')),
  cost REAL,
  source TEXT,
  notes TEXT
);

-- Tools per project (and global tool inventory)
CREATE TABLE IF NOT EXISTS tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owned INTEGER DEFAULT 0,
  location TEXT,
  notes TEXT
);

-- Junction: which tools a project needs
CREATE TABLE IF NOT EXISTS project_tools (
  project_id TEXT NOT NULL REFERENCES projects(id),
  tool_id INTEGER NOT NULL REFERENCES tools(id),
  required INTEGER DEFAULT 1,
  notes TEXT,
  PRIMARY KEY (project_id, tool_id)
);

-- FSM sections linked to projects
CREATE TABLE IF NOT EXISTS fsm_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  title TEXT NOT NULL,
  r2_key TEXT,  -- path in R2 bucket to the PDF/content
  content_hash TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_fsm (
  project_id TEXT NOT NULL REFERENCES projects(id),
  fsm_section_id INTEGER NOT NULL REFERENCES fsm_sections(id),
  PRIMARY KEY (project_id, fsm_section_id)
);

-- Alignment measurements
CREATE TABLE IF NOT EXISTS alignment_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  reading_type TEXT NOT NULL, -- 'before' or 'after'
  toe_lf REAL, toe_rf REAL, toe_lr REAL, toe_rr REAL,
  camber_lf REAL, camber_rf REAL, camber_lr REAL, camber_rr REAL,
  caster_l REAL, caster_r REAL,
  thrust REAL,
  measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  photo_keys TEXT -- JSON array of R2 keys for the source photos
);

-- OBD2 snapshots
CREATE TABLE IF NOT EXISTS obd_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  project_id TEXT REFERENCES projects(id),
  snapshot_type TEXT DEFAULT 'manual', -- 'manual', 'dtc_read', 'live_log'
  data TEXT NOT NULL, -- JSON blob of PIDs/DTCs
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Maintenance log (oil changes, fluid flushes, tire rotations, etc.)
CREATE TABLE IF NOT EXISTS maintenance_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  service_type TEXT NOT NULL,
  mileage INTEGER,
  date_performed DATE,
  notes TEXT,
  cost REAL,
  parts_used TEXT -- JSON
);

-- Project notes / journal (append-only log)
CREATE TABLE IF NOT EXISTS project_journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  entry TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_vehicle ON projects(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_steps_project ON steps(project_id);
CREATE INDEX IF NOT EXISTS idx_parts_project ON parts(project_id);
CREATE INDEX IF NOT EXISTS idx_obd_vehicle ON obd_snapshots(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_log(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_journal_project ON project_journal(project_id);
