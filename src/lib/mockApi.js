/**
 * ──────────────────────────────────────────────────────────────────────────
 *  MOCK BACKEND (DEMO MODE)
 * ──────────────────────────────────────────────────────────────────────────
 *  This module simulates the REST API in-memory so the entire application can
 *  be tested without a running backend. It mirrors the REAL backend contract:
 *  English field names, English enum values and the documented routes.
 *
 *  Data is seeded with realistic Universidad Central del Ecuador (UCE) content
 *  and persisted to localStorage so changes survive page refreshes.
 *
 *  ➜ To switch to the REAL backend: set VITE_USE_MOCK="false".
 *  ➜ To reset demo data: run  window.__siglaResetMock()  in the browser console
 */

const DB_KEY = "sigla_mock_db"
const DB_VERSION = 4 // bump to force a reseed when the seed shape changes

// ── date helpers ───────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function shiftISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function nowHM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
function nowISO() {
  return new Date().toISOString()
}
// Deterministic pseudo attendance so the public view is stable across refreshes.
function pseudoStudents(seed, capacity, registered) {
  const cap = Number(registered || capacity) || 0
  const n = String(seed)
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const pct = 0.45 + ((n * 17) % 50) / 100 // 0.45–0.95
  return Math.min(cap, Math.max(1, Math.round(cap * pct)))
}

// English weekday → JS getDay() index.
const DAY_NUM = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
}

// ── Phase 2 / Phase 3 seed builders ──────────────────────────────────────────
// Row letters used for workstation coordinates.
const ROW_LETTERS = "ABCDEFGH".split("")

/**
 * Builds a workstation grid for a laboratory.
 * @param {string} labId          laboratory id (e.g. "lab-1")
 * @param {string} num            numeric code prefix used in ids (e.g. "101")
 * @param {number} count          total number of workstations
 * @param {number} cols           columns per row
 * @param {object} opts           { defaultStatus, overrides }
 */
function buildStations(labId, num, count, cols, opts = {}) {
  const { defaultStatus = "AVAILABLE", overrides = {} } = opts
  const list = []
  let n = 0
  for (let r = 0; n < count; r++) {
    for (let c = 1; c <= cols && n < count; c++) {
      const code = `${ROW_LETTERS[r]}${c}`
      list.push({
        id: `ws-${num}-${code}`,
        laboratoryId: labId,
        code,
        row: ROW_LETTERS[r],
        column: c,
        status: overrides[code] || defaultStatus,
      })
      n++
    }
  }
  return list
}

/** Builds one computer per workstation, mirroring the workstation status. */
function buildComputers(stations, num, spec) {
  const wsStatusToEquip = {
    AVAILABLE: "OPERATIONAL",
    OCCUPIED: "OPERATIONAL",
    UNDER_MAINTENANCE: "UNDER_MAINTENANCE",
    OUT_OF_SERVICE: "OUT_OF_SERVICE",
  }
  return stations.map((ws) => ({
    id: `eq-${num}-${ws.code}`,
    laboratoryId: ws.laboratoryId,
    workstationId: ws.id,
    type: "COMPUTING",
    brand: spec.brand,
    model: spec.model,
    cpu: spec.cpu,
    ram: spec.ram,
    storage: spec.storage,
    status: wsStatusToEquip[ws.status] || "OPERATIONAL",
    softwareInstalled: [...spec.software],
  }))
}

function buildSeedWorkstations() {
  return [
    // LAB-101 — Programming Room 1 (30, 5 rows × 6 cols)
    ...buildStations("lab-1", "101", 30, 6, {
      overrides: { A3: "UNDER_MAINTENANCE", C4: "UNDER_MAINTENANCE", E6: "OUT_OF_SERVICE" },
    }),
    // LAB-102 — Programming Room 2 (25, 5 rows × 5 cols)
    ...buildStations("lab-2", "102", 25, 5, {
      overrides: { B2: "UNDER_MAINTENANCE" },
    }),
    // LAB-201 — Networking Room (20, 4 rows × 5 cols)
    ...buildStations("lab-3", "201", 20, 5, {
      overrides: { D5: "OUT_OF_SERVICE" },
    }),
    // LAB-202 — IT Infrastructure Room (18, all under maintenance)
    ...buildStations("lab-4", "202", 18, 6, { defaultStatus: "UNDER_MAINTENANCE" }),
    // LAB-103 — Database Room (28, lab is closed → stations left available)
    ...buildStations("lab-6", "103", 28, 7),
    // AULA-301 — Main Lecture Hall has no workstations (theoretical classroom)
  ]
}

function buildSeedEquipment(workstations) {
  const wsFor = (labId) => workstations.filter((w) => w.laboratoryId === labId)

  const hpSpec = {
    brand: "HP",
    model: "ProDesk 600 G6",
    cpu: "Intel Core i7-10700",
    ram: "16 GB",
    storage: "512 GB SSD",
    software: ["Windows 11 Pro", "Visual Studio Code", "JDK 21", "IntelliJ IDEA", "Git", "PostgreSQL 16"],
  }
  const dellSpec = {
    brand: "Dell",
    model: "OptiPlex 7090",
    cpu: "Intel Core i5-11500",
    ram: "8 GB",
    storage: "256 GB SSD",
    software: ["Windows 11 Pro", "Cisco Packet Tracer", "Wireshark", "PuTTY", "GNS3"],
  }
  const dbSpec = {
    brand: "Lenovo",
    model: "ThinkCentre M75q",
    cpu: "AMD Ryzen 5 PRO 4650GE",
    ram: "16 GB",
    storage: "512 GB SSD",
    software: ["Windows 11 Pro", "PostgreSQL 16", "MySQL Workbench", "MongoDB Compass", "DBeaver"],
  }

  const computers = [
    // COMPUTING labs
    ...buildComputers(wsFor("lab-1"), "101", hpSpec),
    ...buildComputers(wsFor("lab-2"), "102", hpSpec),
    // NETWORKS lab — Dell workstations
    ...buildComputers(wsFor("lab-3"), "201", dellSpec),
    // Database Room (COMPUTING)
    ...buildComputers(wsFor("lab-6"), "103", dbSpec),
  ]

  // Dedicated networking devices (no workstation).
  const devices = [
    {
      id: "eq-201-R1",
      laboratoryId: "lab-3",
      workstationId: null,
      type: "NETWORKING_DEVICE",
      brand: "Cisco",
      model: "Catalyst 2960-X",
      cpu: null,
      ram: "64 MB",
      storage: "128 MB Flash",
      status: "OPERATIONAL",
      softwareInstalled: ["IOS 15.2"],
    },
    {
      id: "eq-201-R2",
      laboratoryId: "lab-3",
      workstationId: null,
      type: "NETWORKING_DEVICE",
      brand: "Cisco",
      model: "ISR 4321 Router",
      cpu: null,
      ram: "4 GB",
      storage: "4 GB Flash",
      status: "UNDER_MAINTENANCE",
      softwareInstalled: ["IOS XE 16.9"],
    },
    // Lecture hall projector — no workstation, THEORETICAL still has 1 device.
    {
      id: "eq-301-P1",
      laboratoryId: "lab-5",
      workstationId: null,
      type: "PROJECTOR",
      brand: "Epson",
      model: "PowerLite X49",
      cpu: null,
      ram: null,
      storage: null,
      status: "OPERATIONAL",
      softwareInstalled: [],
    },
  ]

  return [...computers, ...devices]
}

function buildSeedIncidents() {
  return [
    {
      id: "inc-001",
      code: "INC-2026-001",
      laboratoryId: "lab-1",
      workstationId: "ws-101-A3",
      equipmentId: "eq-101-A3",
      type: "INCIDENT",
      category: "HARDWARE",
      description: "The workstation at seat A3 does not power on at the start of class.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      reportedBy: "Eng. Carlos Vásquez",
      createdAt: "2026-07-07T08:15:00Z",
      actions: [
        "Technician inspected the computer — power supply failure.",
        "Replacement part has been requested.",
      ],
    },
    {
      id: "inc-002",
      code: "INC-2026-002",
      laboratoryId: "lab-3",
      workstationId: null,
      equipmentId: "eq-201-R2",
      type: "INCIDENT",
      category: "NETWORKING",
      description: "Cisco ISR 4321 router shows intermittent connectivity on GigabitEthernet0/0/1.",
      status: "OPEN",
      priority: "CRITICAL",
      reportedBy: "Eng. María Jaramillo",
      createdAt: "2026-07-06T14:30:00Z",
      actions: [],
    },
    {
      id: "inc-003",
      code: "INC-2026-003",
      laboratoryId: "lab-1",
      workstationId: null,
      equipmentId: null,
      type: "REQUEST",
      category: "SOFTWARE",
      description: "Request to install Docker Desktop on all LAB-101 computers for the Software Architecture course.",
      status: "OPEN",
      priority: "MEDIUM",
      reportedBy: "Eng. Carlos Vásquez",
      createdAt: "2026-07-05T10:00:00Z",
      actions: [],
    },
    {
      id: "inc-004",
      code: "INC-2026-004",
      laboratoryId: "lab-4",
      workstationId: null,
      equipmentId: null,
      type: "INCIDENT",
      category: "INFRASTRUCTURE",
      description: "Laboratory air conditioning is out of service. Lab remains under maintenance until further notice.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      reportedBy: "UCE Administrator",
      createdAt: "2026-07-01T09:00:00Z",
      actions: ["Maintenance technician scheduled for July 10."],
    },
  ]
}

// ── seed data (UCE) ──────────────────────────────────────────────────────────
function seed() {
  const ts = nowISO()
  const stamp = { createdAt: ts, updatedAt: ts }
  const workstations = buildSeedWorkstations()
  const equipment = buildSeedEquipment(workstations)
  return {
    _v: DB_VERSION,
    workstations,
    equipment,
    incidents: buildSeedIncidents(),
    faculties: [
      { id: "fac-1", name: "Faculty of Engineering and Applied Sciences", ...stamp },
      { id: "fac-2", name: "Faculty of Medical Sciences", ...stamp },
    ],
    academicPrograms: [
      { id: "prog-1", facultyId: "fac-1", name: "Information Systems Engineering", ...stamp },
      { id: "prog-2", facultyId: "fac-1", name: "Computer Engineering", ...stamp },
      { id: "prog-3", facultyId: "fac-2", name: "Medicine", ...stamp },
    ],
    subjects: [
      { id: "subj-1", academicProgramId: "prog-1", name: "Programming I", semester: 1, ...stamp },
      { id: "subj-2", academicProgramId: "prog-1", name: "Data Structures", semester: 2, ...stamp },
      { id: "subj-3", academicProgramId: "prog-1", name: "IT Infrastructure I", semester: 3, ...stamp },
      { id: "subj-4", academicProgramId: "prog-2", name: "Computer Networks", semester: 5, ...stamp },
      { id: "subj-5", academicProgramId: "prog-1", name: "Software Architecture", semester: 7, ...stamp },
      { id: "subj-6", academicProgramId: "prog-1", name: "Databases", semester: 4, ...stamp },
    ],
    users: [
      { id: "user-admin", firstName: "System", lastName: "Administrator", email: "admin@uce.edu.ec", role: "ADMIN", enabled: true, ...stamp },
      { id: "user-1", firstName: "Carlos", lastName: "Vásquez", email: "cvasquez@uce.edu.ec", role: "TEACHER", enabled: true, ...stamp },
      { id: "user-2", firstName: "María", lastName: "Jaramillo", email: "mjaramillo@uce.edu.ec", role: "TEACHER", enabled: true, ...stamp },
      { id: "user-3", firstName: "Luis", lastName: "Andrade", email: "landrade@uce.edu.ec", role: "TEACHER", enabled: true, ...stamp },
      { id: "user-4", firstName: "Ana", lastName: "Torres", email: "atorres@uce.edu.ec", role: "TEACHER", enabled: true, ...stamp },
    ],
    teacherSubjectAssignments: [
      { id: "tsa-1", teacherId: "user-1", subjectId: "subj-1", status: "ACTIVE", ...stamp },
      { id: "tsa-2", teacherId: "user-1", subjectId: "subj-2", status: "ACTIVE", ...stamp },
      { id: "tsa-3", teacherId: "user-2", subjectId: "subj-3", status: "ACTIVE", ...stamp },
      { id: "tsa-4", teacherId: "user-2", subjectId: "subj-4", status: "ACTIVE", ...stamp },
      { id: "tsa-5", teacherId: "user-3", subjectId: "subj-5", status: "ACTIVE", ...stamp },
      { id: "tsa-6", teacherId: "user-4", subjectId: "subj-6", status: "ACTIVE", ...stamp },
    ],
    academicPeriods: [
      { id: "period-1", name: "2024-II", startDate: "2024-10-01", endDate: "2025-02-28", status: "CLOSED", ...stamp },
      { id: "period-2", name: "2025-I", startDate: "2025-04-01", endDate: "2025-08-31", status: "ACTIVE", ...stamp },
    ],
    laboratories: [
      { id: "lab-1", facultyId: "fac-1", code: "LAB-101", name: "Programming Room 1", type: "COMPUTING", capacity: 30, status: "ACTIVE", ...stamp },
      { id: "lab-2", facultyId: "fac-1", code: "LAB-102", name: "Programming Room 2", type: "COMPUTING", capacity: 25, status: "ACTIVE", ...stamp },
      { id: "lab-3", facultyId: "fac-1", code: "LAB-201", name: "Networking and Telecommunications Room", type: "NETWORKS", capacity: 20, status: "ACTIVE", ...stamp },
      { id: "lab-4", facultyId: "fac-1", code: "LAB-202", name: "IT Infrastructure Room", type: "INDUSTRIAL", capacity: 18, status: "UNDER_MAINTENANCE", ...stamp },
      { id: "lab-5", facultyId: "fac-2", code: "AULA-301", name: "Main Lecture Hall", type: "THEORETICAL", capacity: 40, status: "ACTIVE", ...stamp },
      { id: "lab-6", facultyId: "fac-1", code: "LAB-103", name: "Database Room", type: "COMPUTING", capacity: 28, status: "CLOSED", ...stamp },
    ],
    baseSchedules: [
      { id: "bs-1", academicPeriodId: "period-2", laboratoryId: "lab-1", teacherId: "user-1", subjectId: "subj-1", weekDay: "MONDAY", startTime: "08:00:00", endTime: "10:00:00", registeredStudentCount: 30, ...stamp },
      { id: "bs-2", academicPeriodId: "period-2", laboratoryId: "lab-2", teacherId: "user-1", subjectId: "subj-2", weekDay: "MONDAY", startTime: "10:00:00", endTime: "12:00:00", registeredStudentCount: 25, ...stamp },
      { id: "bs-3", academicPeriodId: "period-2", laboratoryId: "lab-3", teacherId: "user-2", subjectId: "subj-4", weekDay: "TUESDAY", startTime: "09:00:00", endTime: "11:00:00", registeredStudentCount: 20, ...stamp },
      { id: "bs-4", academicPeriodId: "period-2", laboratoryId: "lab-1", teacherId: "user-2", subjectId: "subj-3", weekDay: "WEDNESDAY", startTime: "14:00:00", endTime: "16:00:00", registeredStudentCount: 28, ...stamp },
      { id: "bs-5", academicPeriodId: "period-2", laboratoryId: "lab-2", teacherId: "user-3", subjectId: "subj-5", weekDay: "THURSDAY", startTime: "08:00:00", endTime: "10:00:00", registeredStudentCount: 24, ...stamp },
      { id: "bs-6", academicPeriodId: "period-2", laboratoryId: "lab-3", teacherId: "user-1", subjectId: "subj-1", weekDay: "FRIDAY", startTime: "11:00:00", endTime: "13:00:00", registeredStudentCount: 20, ...stamp },
    ],
    sessions: [
      { id: "ses-1", baseScheduleId: "bs-1", academicPeriodId: "period-2", teacherId: "user-1", subjectId: "subj-1", laboratoryId: "lab-1", date: todayISO(), startTime: "08:00:00", endTime: "10:00:00", registeredStudentCount: 30, attendedStudentCount: 28, status: "FINISHED", teacherAttendance: "ARRIVED", ...stamp },
      { id: "ses-2", baseScheduleId: "bs-3", academicPeriodId: "period-2", teacherId: "user-2", subjectId: "subj-4", laboratoryId: "lab-3", date: todayISO(), startTime: "10:00:00", endTime: "12:00:00", registeredStudentCount: 20, attendedStudentCount: 17, status: "IN_PROGRESS", teacherAttendance: "NOT_RECORDED", ...stamp },
      { id: "ses-3", baseScheduleId: "bs-4", academicPeriodId: "period-2", teacherId: "user-2", subjectId: "subj-3", laboratoryId: "lab-1", date: todayISO(), startTime: "14:00:00", endTime: "16:00:00", registeredStudentCount: 28, attendedStudentCount: 0, status: "SCHEDULED", teacherAttendance: "NOT_RECORDED", ...stamp },
      { id: "ses-4", baseScheduleId: null, academicPeriodId: "period-2", teacherId: "user-4", subjectId: "subj-6", laboratoryId: "lab-5", date: todayISO(), startTime: "11:00:00", endTime: "13:00:00", registeredStudentCount: 35, attendedStudentCount: 0, status: "SCHEDULED", teacherAttendance: "NOT_RECORDED", ...stamp },
      { id: "ses-5", baseScheduleId: "bs-2", academicPeriodId: "period-2", teacherId: "user-1", subjectId: "subj-2", laboratoryId: "lab-2", date: shiftISO(1), startTime: "10:00:00", endTime: "12:00:00", registeredStudentCount: 25, attendedStudentCount: 0, status: "SCHEDULED", teacherAttendance: "NOT_RECORDED", ...stamp },
      { id: "ses-6", baseScheduleId: "bs-6", academicPeriodId: "period-2", teacherId: "user-1", subjectId: "subj-1", laboratoryId: "lab-3", date: shiftISO(-1), startTime: "11:00:00", endTime: "13:00:00", registeredStudentCount: 20, attendedStudentCount: 15, status: "FINISHED", teacherAttendance: "LATE", ...stamp },
    ],
  }
}

// ── persistence ──────────────────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed._v === DB_VERSION) return parsed
    }
  } catch {
    /* ignore corrupted storage */
  }
  const fresh = seed()
  save(fresh)
  return fresh
}
function save(d) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(d))
  } catch {
    /* storage may be unavailable */
  }
}

let db = load()

if (typeof window !== "undefined") {
  // Convenience helper to reset the demo data from the browser console.
  window.__siglaResetMock = () => {
    db = seed()
    save(db)
    // eslint-disable-next-line no-console
    console.log("[SIGLA] Mock DB reset to seed data.")
  }
}

// ── small utilities ──────────────────────────────────────────────────────────
const delay = (ms = 160) => new Promise((r) => setTimeout(r, ms))
const eqId = (a, b) => String(a) === String(b)
let _seq = Date.now()
function uid(prefix) {
  _seq += 1
  return `${prefix}-${_seq.toString(36)}`
}

function badRequest(message, details) {
  const err = new Error(message || "Bad Request")
  err.status = 400
  err.payload = {
    timestamp: nowISO(),
    status: 400,
    error: "Bad Request",
    message: message || "Bad Request",
    details: details || [],
  }
  throw err
}

function notFound() {
  const err = new Error("Resource not found (mock).")
  err.status = 404
  err.payload = {
    timestamp: nowISO(),
    status: 404,
    error: "Not Found",
    message: "Resource not found (mock).",
    details: [],
  }
  throw err
}

const labOf = (id) => db.laboratories.find((l) => eqId(l.id, id))
const subjectOf = (id) => db.subjects.find((s) => eqId(s.id, id))
const userOf = (id) => db.users.find((u) => eqId(u.id, id))
const fullName = (u) => (u ? `${u.firstName} ${u.lastName}`.trim() : undefined)

/** Adds human-readable names used by admin views (English field names). */
function enrich(record) {
  const lab = labOf(record.laboratoryId)
  const subj = subjectOf(record.subjectId)
  const user = userOf(record.teacherId)
  return {
    ...record,
    subjectName: subj?.name,
    laboratoryName: lab?.name,
    laboratoryCode: lab?.code,
    teacherName: fullName(user),
  }
}

// ── Phase 2/3 lookups & summaries ──────────────────────────────────────────
const stationsOf = (labId) => db.workstations.filter((w) => eqId(w.laboratoryId, labId))
const equipmentOf = (labId) => db.equipment.filter((e) => eqId(e.laboratoryId, labId))
const incidentsOf = (labId) => db.incidents.filter((i) => eqId(i.laboratoryId, labId))
const ACTIVE_INCIDENT = (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"

/** Compact inventory summary for the public status endpoint (null when no stations). */
function inventorySummaryFor(labId) {
  const ws = stationsOf(labId)
  if (!ws.length) return null
  return {
    totalWorkstations: ws.length,
    availableWorkstations: ws.filter((w) => w.status === "AVAILABLE" || w.status === "OCCUPIED").length,
    underMaintenance: ws.filter((w) => w.status === "UNDER_MAINTENANCE").length,
    outOfService: ws.filter((w) => w.status === "OUT_OF_SERVICE").length,
  }
}

/** Compact incident summary for the public status endpoint. */
function incidentSummaryFor(labId) {
  const list = incidentsOf(labId)
  return {
    openIncidents: list.filter((i) => i.status === "OPEN").length,
    criticalIncidents: list.filter((i) => i.priority === "CRITICAL" && ACTIVE_INCIDENT(i)).length,
    inProgressIncidents: list.filter((i) => i.status === "IN_PROGRESS").length,
  }
}

/** Full inventory payload with equipment attached to each workstation. */
function inventoryResponse(labId) {
  const ws = stationsOf(labId)
  const eq = equipmentOf(labId)
  const workstations = ws.map((w) => ({
    ...w,
    equipment: eq.find((e) => eqId(e.workstationId, w.id)) || null,
  }))
  const devices = eq.filter((e) => e.workstationId == null)
  return {
    laboratoryId: labId,
    totalWorkstations: ws.length,
    availableWorkstations: ws.filter((w) => w.status === "AVAILABLE" || w.status === "OCCUPIED").length,
    underMaintenanceWorkstations: ws.filter((w) => w.status === "UNDER_MAINTENANCE").length,
    outOfServiceWorkstations: ws.filter((w) => w.status === "OUT_OF_SERVICE").length,
    totalEquipment: eq.length,
    operationalEquipment: eq.filter((e) => e.status === "OPERATIONAL").length,
    underMaintenanceEquipment: eq.filter((e) => e.status === "UNDER_MAINTENANCE").length,
    workstations,
    devices,
  }
}

// Generic CRUD collection handler.
function crud(collection, method, id, body) {
  const list = db[collection]
  if (method === "GET") {
    if (id == null) return list
    const found = list.find((x) => eqId(x.id, id))
    if (!found) notFound()
    return found
  }
  if (method === "POST") {
    const record = { ...body, id: uid(collection), createdAt: nowISO(), updatedAt: nowISO() }
    list.push(record)
    return record
  }
  if (method === "PUT" || method === "PATCH") {
    const idx = list.findIndex((x) => eqId(x.id, id))
    if (idx === -1) notFound()
    list[idx] = { ...list[idx], ...body, id: list[idx].id, updatedAt: nowISO() }
    return list[idx]
  }
  if (method === "DELETE") {
    const idx = list.findIndex((x) => eqId(x.id, id))
    if (idx === -1) notFound()
    list.splice(idx, 1)
    return "Deleted successfully."
  }
  notFound()
}

// ── router ───────────────────────────────────────────────────────────────────
function route(method, path, query, body) {
  const p = path.replace(/\/$/, "") // strip a single trailing slash
  let m

  // Auth ----------------------------------------------------------------------
  if (p === "/auth/login" && method === "POST") {
    const email = body?.email || "admin@uce.edu.ec"
    return {
      accessToken: "mock-token",
      user: {
        id: "user-admin",
        firstName: "System",
        lastName: "Administrator",
        name: "System Administrator",
        email,
        role: "ADMIN",
      },
    }
  }
  if (p === "/auth/logout") return null

  // Faculties -----------------------------------------------------------------
  // Cascading academic programs by faculty (must precede /faculties/{id}).
  m = p.match(/^\/faculties\/([^/]+)\/academic-programs$/)
  if (m && method === "GET") {
    return db.academicPrograms.filter((ap) => eqId(ap.facultyId, m[1]))
  }
  if (p === "/faculties") return crud("faculties", method, null, body)
  m = p.match(/^\/faculties\/(.+)$/)
  if (m) return crud("faculties", method, m[1], body)

  // Academic programs ---------------------------------------------------------
  if (p === "/academic-programs") return crud("academicPrograms", method, null, body)
  m = p.match(/^\/academic-programs\/(.+)$/)
  if (m) return crud("academicPrograms", method, m[1], body)

  // Subjects ------------------------------------------------------------------
  if (p === "/subjects") {
    if (method === "GET" && query.academicProgramId) {
      return db.subjects.filter((s) => eqId(s.academicProgramId, query.academicProgramId))
    }
    return crud("subjects", method, null, body)
  }
  m = p.match(/^\/subjects\/(.+)$/)
  if (m) return crud("subjects", method, m[1], body)

  // Academic periods ----------------------------------------------------------
  if (p === "/academic-periods/active" && method === "GET") {
    return db.academicPeriods.find((pd) => pd.status === "ACTIVE") || null
  }
  if (p === "/academic-periods") return crud("academicPeriods", method, null, body)

  // Generate sessions from ALL base schedules of the period (no body).
  m = p.match(/^\/academic-periods\/([^/]+)\/sessions\/generate$/)
  if (m && method === "POST") {
    return generateSessions(m[1])
  }
  // Generate from a specific list of base schedules.
  m = p.match(/^\/academic-periods\/([^/]+)\/sessions\/generate-from-base-schedules$/)
  if (m && method === "POST") {
    return generateSessions(m[1], body?.baseScheduleIds || [])
  }
  // Base schedules by period (REST alternative to ?academicPeriodId=).
  m = p.match(/^\/academic-periods\/([^/]+)\/base-schedules$/)
  if (m && method === "GET") {
    return db.baseSchedules.filter((s) => eqId(s.academicPeriodId, m[1])).map(enrich)
  }
  // Activate / close.
  m = p.match(/^\/academic-periods\/([^/]+)\/activate$/)
  if (m && method === "PATCH") {
    const period = db.academicPeriods.find((pd) => eqId(pd.id, m[1]))
    if (!period) notFound()
    const other = db.academicPeriods.find((pd) => pd.status === "ACTIVE" && !eqId(pd.id, m[1]))
    if (other) badRequest("There is already an active academic period. Close it before activating another.")
    period.status = "ACTIVE"
    period.updatedAt = nowISO()
    return period
  }
  m = p.match(/^\/academic-periods\/([^/]+)\/close$/)
  if (m && method === "PATCH") {
    const period = db.academicPeriods.find((pd) => eqId(pd.id, m[1]))
    if (!period) notFound()
    period.status = "CLOSED"
    period.updatedAt = nowISO()
    return period
  }
  m = p.match(/^\/academic-periods\/(.+)$/)
  if (m) return crud("academicPeriods", method, m[1], body)

  // Users ---------------------------------------------------------------------
  // Subject assignments by teacher (must precede /users/{id}).
  m = p.match(/^\/users\/([^/]+)\/subject-assignments$/)
  if (m && method === "GET") {
    return db.teacherSubjectAssignments.filter((a) => eqId(a.teacherId, m[1]))
  }
  m = p.match(/^\/users\/([^/]+)\/enable$/)
  if (m && method === "PATCH") {
    const u = userOf(m[1])
    if (!u) notFound()
    u.enabled = true
    u.updatedAt = nowISO()
    return u
  }
  m = p.match(/^\/users\/([^/]+)\/disable$/)
  if (m && method === "PATCH") {
    const u = userOf(m[1])
    if (!u) notFound()
    u.enabled = false
    u.updatedAt = nowISO()
    return u
  }
  if (p === "/users") {
    if (method === "GET") {
      const list = query.role ? db.users.filter((u) => u.role === query.role) : db.users
      return list
    }
    if (method === "POST") {
      const record = {
        id: uid("user"),
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        role: body.role || "TEACHER",
        enabled: body.enabled !== undefined ? body.enabled : true,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
      db.users.push(record)
      return record
    }
  }
  m = p.match(/^\/users\/(.+)$/)
  if (m) {
    if (method === "DELETE") {
      db.teacherSubjectAssignments = db.teacherSubjectAssignments.filter((a) => !eqId(a.teacherId, m[1]))
    }
    return crud("users", method, m[1], body)
  }

  // Teacher-subject assignments -----------------------------------------------
  if (p === "/teacher-subject-assignments" && method === "POST") {
    const record = {
      id: uid("tsa"),
      teacherId: body.teacherId,
      subjectId: body.subjectId,
      status: body.status || "ACTIVE",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
    db.teacherSubjectAssignments.push(record)
    return record
  }
  m = p.match(/^\/teacher-subject-assignments\/([^/]+)\/activate$/)
  if (m && method === "PATCH") {
    const a = db.teacherSubjectAssignments.find((x) => eqId(x.id, m[1]))
    if (!a) notFound()
    a.status = "ACTIVE"
    a.updatedAt = nowISO()
    return a
  }
  m = p.match(/^\/teacher-subject-assignments\/([^/]+)\/deactivate$/)
  if (m && method === "PATCH") {
    const a = db.teacherSubjectAssignments.find((x) => eqId(x.id, m[1]))
    if (!a) notFound()
    a.status = "INACTIVE"
    a.updatedAt = nowISO()
    return a
  }
  m = p.match(/^\/teacher-subject-assignments\/(.+)$/)
  if (m && method === "DELETE") {
    const idx = db.teacherSubjectAssignments.findIndex((a) => eqId(a.id, m[1]))
    if (idx === -1) notFound()
    db.teacherSubjectAssignments.splice(idx, 1)
    return "Deleted successfully."
  }

  // Laboratories --------------------------------------------------------------
  m = p.match(/^\/laboratories\/([^/]+)\/status$/)
  if (m && method === "PATCH") {
    const lab = labOf(m[1])
    if (!lab) notFound()
    lab.status = body.status
    lab.updatedAt = nowISO()
    return lab
  }
  if (p === "/laboratories") {
    if (method === "GET") {
      let list = db.laboratories
      if (query.status) list = list.filter((l) => l.status === query.status)
      if (query.type) list = list.filter((l) => l.type === query.type)
      if (query.facultyId) list = list.filter((l) => eqId(l.facultyId, query.facultyId))
      return list
    }
    return crud("laboratories", method, null, body)
  }
  m = p.match(/^\/laboratories\/(.+)$/)
  if (m) return crud("laboratories", method, m[1], body)

  // Base schedules ------------------------------------------------------------
  if (p === "/base-schedules") {
    if (method === "GET") {
      const list = query.academicPeriodId
        ? db.baseSchedules.filter((s) => eqId(s.academicPeriodId, query.academicPeriodId))
        : db.baseSchedules
      return list.map(enrich)
    }
    if (method === "POST") {
      const record = { ...body, id: uid("bs"), createdAt: nowISO(), updatedAt: nowISO() }
      db.baseSchedules.push(record)
      return enrich(record)
    }
  }
  m = p.match(/^\/base-schedules\/(.+)$/)
  if (m) {
    if (method === "DELETE") return crud("baseSchedules", method, m[1], body)
    const updated = crud("baseSchedules", method, m[1], body)
    return updated ? enrich(updated) : updated
  }

  // Sessions ------------------------------------------------------------------
  if (p === "/sessions" && method === "GET") {
    let list = db.sessions
    if (query.academicPeriodId) list = list.filter((s) => eqId(s.academicPeriodId, query.academicPeriodId))
    if (query.status) list = list.filter((s) => s.status === query.status)
    if (query.laboratoryId) list = list.filter((s) => eqId(s.laboratoryId, query.laboratoryId))
    if (query.date) list = list.filter((s) => s.date === query.date)
    list = [...list].sort((a, b) =>
      a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
    )
    return list.map(enrich)
  }
  m = p.match(/^\/sessions\/([^/]+)\/status$/)
  if (m && method === "PATCH") {
    const s = db.sessions.find((x) => eqId(x.id, m[1]))
    if (!s) notFound()
    s.status = body.status
    s.updatedAt = nowISO()
    return enrich(s)
  }
  m = p.match(/^\/sessions\/([^/]+)\/teacher-attendance$/)
  if (m && method === "PATCH") {
    const s = db.sessions.find((x) => eqId(x.id, m[1]))
    if (!s) notFound()
    s.teacherAttendance = body.teacherAttendance
    s.updatedAt = nowISO()
    return enrich(s)
  }
  m = p.match(/^\/sessions\/([^/]+)\/cancel$/)
  if (m && method === "PATCH") {
    const s = db.sessions.find((x) => eqId(x.id, m[1]))
    if (!s) notFound()
    s.status = "CANCELLED"
    s.updatedAt = nowISO()
    return enrich(s)
  }

  // Workstations --------------------------------------------------------------
  if (p === "/workstations") {
    if (method === "GET") {
      let list = db.workstations
      if (query.laboratoryId) list = list.filter((w) => eqId(w.laboratoryId, query.laboratoryId))
      if (query.status) list = list.filter((w) => w.status === query.status)
      return list
    }
    if (method === "POST") return crud("workstations", method, null, body)
  }
  m = p.match(/^\/workstations\/([^/]+)\/status$/)
  if (m && method === "PATCH") {
    const ws = db.workstations.find((w) => eqId(w.id, m[1]))
    if (!ws) notFound()
    ws.status = body.status
    ws.updatedAt = nowISO()
    return ws
  }
  m = p.match(/^\/workstations\/(.+)$/)
  if (m) return crud("workstations", method, m[1], body)

  // Equipment -----------------------------------------------------------------
  if (p === "/equipment") {
    if (method === "GET") {
      let list = db.equipment
      if (query.laboratoryId) list = list.filter((e) => eqId(e.laboratoryId, query.laboratoryId))
      if (query.workstationId) list = list.filter((e) => eqId(e.workstationId, query.workstationId))
      return list
    }
    if (method === "POST") return crud("equipment", method, null, body)
  }
  m = p.match(/^\/equipment\/([^/]+)\/status$/)
  if (m && method === "PATCH") {
    const eq = db.equipment.find((e) => eqId(e.id, m[1]))
    if (!eq) notFound()
    eq.status = body.status
    eq.updatedAt = nowISO()
    return eq
  }
  m = p.match(/^\/equipment\/(.+)$/)
  if (m) return crud("equipment", method, m[1], body)

  // Incidents -----------------------------------------------------------------
  m = p.match(/^\/incidents\/([^/]+)\/status$/)
  if (m && method === "PATCH") {
    const inc = db.incidents.find((i) => eqId(i.id, m[1]))
    if (!inc) notFound()
    inc.status = body.status
    inc.updatedAt = nowISO()
    return inc
  }
  m = p.match(/^\/incidents\/([^/]+)\/actions$/)
  if (m && method === "PATCH") {
    const inc = db.incidents.find((i) => eqId(i.id, m[1]))
    if (!inc) notFound()
    if (!Array.isArray(inc.actions)) inc.actions = []
    if (body?.action) inc.actions.push(body.action)
    inc.updatedAt = nowISO()
    return inc
  }
  if (p === "/incidents") {
    if (method === "GET") {
      let list = db.incidents
      if (query.laboratoryId) list = list.filter((i) => eqId(i.laboratoryId, query.laboratoryId))
      if (query.status) list = list.filter((i) => i.status === query.status)
      if (query.priority) list = list.filter((i) => i.priority === query.priority)
      if (query.type) list = list.filter((i) => i.type === query.type)
      return [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    }
    if (method === "POST") {
      const year = new Date().getFullYear()
      const nextNum = db.incidents.length + 1
      const record = {
        id: uid("inc"),
        code: `INC-${year}-${String(nextNum).padStart(3, "0")}`,
        laboratoryId: body.laboratoryId,
        workstationId: body.workstationId || null,
        equipmentId: body.equipmentId || null,
        type: body.type || "INCIDENT",
        category: body.category || "OTHER",
        description: body.description || "",
        status: "OPEN",
        priority: body.priority || "MEDIUM",
        reportedBy: body.reportedBy || "System Administrator",
        actions: [],
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
      db.incidents.push(record)
      return record
    }
  }
  m = p.match(/^\/incidents\/(.+)$/)
  if (m) return crud("incidents", method, m[1], body)

  // Public (no auth) ----------------------------------------------------------
  m = p.match(/^\/public\/laboratories\/([^/]+)\/inventory$/)
  if (m && method === "GET") {
    if (!labOf(m[1])) notFound()
    return inventoryResponse(m[1])
  }
  m = p.match(/^\/public\/laboratories\/([^/]+)\/incidents$/)
  if (m && method === "GET") {
    if (!labOf(m[1])) notFound()
    return incidentsOf(m[1])
      .filter(ACTIVE_INCIDENT)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((i) => ({
        id: i.id,
        code: i.code,
        type: i.type,
        category: i.category,
        description: i.description,
        status: i.status,
        priority: i.priority,
        createdAt: i.createdAt,
      }))
  }
  if (p === "/public/laboratories/status" && method === "GET") {
    const now = nowHM()
    const today = todayISO()
    let labs = db.laboratories
    if (query.facultyId) labs = labs.filter((l) => eqId(l.facultyId, query.facultyId))
    const todaySessions = db.sessions.filter((s) => s.date === today)

    const buildSession = (s, withStudents) => {
      if (!s) return null
      const base = {
        subject: subjectOf(s.subjectId)?.name ?? null,
        teacher: fullName(userOf(s.teacherId)) ?? null,
        startTime: s.startTime.slice(0, 5),
        endTime: s.endTime.slice(0, 5),
      }
      if (withStudents) {
        base.totalStudents = s.registeredStudentCount ?? 0
        base.sessionStatus = s.status
      }
      return base
    }

    return labs.map((lab) => {
      const labSessions = todaySessions
        .filter((s) => eqId(s.laboratoryId, lab.id) && s.status !== "CANCELLED")
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
      const current =
        lab.status === "ACTIVE"
          ? labSessions.find(
              (s) =>
                s.status === "IN_PROGRESS" ||
                (s.startTime.slice(0, 5) <= now && now < s.endTime.slice(0, 5)),
            )
          : null
      const next = labSessions.find((s) => s.startTime.slice(0, 5) > now && !eqId(s.id, current?.id))

      return {
        id: lab.id,
        facultyId: lab.facultyId,
        code: lab.code,
        name: lab.name,
        type: lab.type,
        capacity: lab.capacity,
        status: lab.status,
        currentSession: buildSession(current, true),
        nextSession: buildSession(next, false),
        inventorySummary: inventorySummaryFor(lab.id),
        incidentSummary: incidentSummaryFor(lab.id),
      }
    })
  }

  if (p === "/public/sessions/today" && method === "GET") {
    const today = todayISO()
    return db.sessions
      .filter((s) => s.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((s) => {
        const lab = labOf(s.laboratoryId)
        return {
          id: s.id,
          subjectId: s.subjectId,
          laboratoryId: s.laboratoryId,
          teacherId: s.teacherId,
          subject: subjectOf(s.subjectId)?.name ?? null,
          teacher: fullName(userOf(s.teacherId)) ?? null,
          laboratory: lab?.name ?? null,
          labCode: lab?.code ?? null,
          startTime: s.startTime.slice(0, 5),
          endTime: s.endTime.slice(0, 5),
          totalStudents: s.registeredStudentCount ?? 0,
          status: s.status,
        }
      })
  }

  // Fallback ------------------------------------------------------------------
  notFound()
}

/** Generates concrete sessions from base schedules of a period. */
function generateSessions(academicPeriodId, onlyIds) {
  const period = db.academicPeriods.find((pd) => eqId(pd.id, academicPeriodId))
  if (!period) notFound()
  const startDate = period.startDate
  const endDate = period.endDate
  if (!startDate || !endDate) badRequest("The academic period has no start/end date.")

  let schedules = db.baseSchedules.filter((s) => eqId(s.academicPeriodId, academicPeriodId))
  if (onlyIds && onlyIds.length) {
    schedules = schedules.filter((s) => onlyIds.some((id) => eqId(id, s.id)))
  }

  // Remove existing sessions in this period within the range, then regenerate.
  db.sessions = db.sessions.filter((s) => {
    if (!eqId(s.academicPeriodId, academicPeriodId)) return true
    return s.date < startDate || s.date > endDate
  })

  const created = []
  const [sy, sm, sd] = startDate.split("-").map(Number)
  const [ey, em, ed] = endDate.split("-").map(Number)
  const cursor = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  while (cursor <= end) {
    const weekday = cursor.getDay()
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
    for (const sch of schedules) {
      if (DAY_NUM[sch.weekDay] === weekday) {
        const record = {
          id: uid("ses"),
          baseScheduleId: sch.id,
          academicPeriodId,
          teacherId: sch.teacherId,
          subjectId: sch.subjectId,
          laboratoryId: sch.laboratoryId,
          date: iso,
          startTime: sch.startTime,
          endTime: sch.endTime,
          registeredStudentCount: sch.registeredStudentCount ?? 0,
          attendedStudentCount: 0,
          status: "SCHEDULED",
          teacherAttendance: "NOT_RECORDED",
          createdAt: nowISO(),
          updatedAt: nowISO(),
        }
        db.sessions.push(record)
        created.push(enrich(record))
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return created
}

/**
 * Entry point used by the API client. Mirrors apiFetch's signature/return.
 */
export async function mockApiFetch(path, options = {}) {
  await delay()
  const method = (options.method || "GET").toUpperCase()
  let body = options.body
  if (typeof body === "string") {
    try {
      body = JSON.parse(body)
    } catch {
      /* leave as-is */
    }
  }
  const [rawPath, qs] = path.split("?")
  const query = Object.fromEntries(new URLSearchParams(qs || ""))
  const result = route(method, rawPath, query, body)
  save(db)
  return result
}
