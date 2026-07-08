/**
 * ──────────────────────────────────────────────────────────────────────────
 *  MOCK BACKEND (DEMO MODE)
 * ──────────────────────────────────────────────────────────────────────────
 *  This module simulates the REST API in-memory so the entire application can
 *  be tested without a running backend. It mirrors the REAL Spring Boot backend
 *  contract exactly: English field names, English enum values, UUID foreign
 *  keys (categoryId / typeId) and the documented routes at /api/v1.
 *
 *  Data is seeded with realistic Universidad Central del Ecuador (UCE) content
 *  and persisted to localStorage so changes survive page refreshes.
 *
 *  ➜ To switch to the REAL backend: set VITE_USE_MOCK="false".
 *  ➜ To reset demo data: run  window.__siglaResetMock()  in the browser console
 */

const DB_KEY = "sigla_mock_db"
  const DB_VERSION = 6 // bump to force a reseed when the seed shape changes

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

// ── Stable catalog ids (used as UUID-like foreign keys) ─────────────────────
const LAB_CAT = {
  COMPUTING: "cat-lab-computing",
  NETWORKS: "cat-lab-networks",
  INDUSTRIAL: "cat-lab-industrial",
  THEORETICAL: "cat-lab-theoretical",
  OTHER: "cat-lab-other",
}
const EQ_CAT = {
  COMPUTER: "cat-eq-computer",
  NETWORK: "cat-eq-network",
  PROJECTOR: "cat-eq-projector",
  PERIPHERAL: "cat-eq-peripheral",
}
const INC_TYPE = {
  INCIDENT: "itype-incident",
  REQUEST: "itype-request",
}

// ── Phase 2 / Phase 3 seed builders ──────────────────────────────────────────
// Row letters used for workstation display codes.
const ROW_LETTERS = "ABCDEFGH".split("")

/**
 * Builds a workstation grid for a laboratory.
 * Backend shape: { rowNumber:int, columnNumber:int, status:ACTIVE|INACTIVE|UNDER_MAINTENANCE }
 */
function buildStations(labId, num, count, cols, opts = {}) {
  const { defaultStatus = "ACTIVE", overrides = {} } = opts
  const list = []
  let n = 0
  for (let r = 0; n < count; r++) {
    for (let c = 1; c <= cols && n < count; c++) {
      const code = `${ROW_LETTERS[r]}${c}`
      list.push({
        id: `ws-${num}-${code}`,
        laboratoryId: labId,
        code,
        rowNumber: r + 1,
        columnNumber: c,
        status: overrides[code] || defaultStatus,
      })
      n++
    }
  }
  return list
}

/** Maps a workstation status to its computer equipment status. */
const WS_TO_EQUIP = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  UNDER_MAINTENANCE: "UNDER_MAINTENANCE",
}

/** Builds one computer per workstation, mirroring the workstation status. */
function buildComputers(stations, num, spec) {
  return stations.map((ws) => ({
    id: `eq-${num}-${ws.code}`,
    laboratoryId: ws.laboratoryId,
    workstationId: ws.id,
    categoryId: EQ_CAT.COMPUTER,
    code: `EQ-${num}-${ws.code}`,
    name: spec.name,
    status: WS_TO_EQUIP[ws.status] || "ACTIVE",
  }))
}

// Peripherals attached to every workstation (multi-equipment per station).
const PERIPHERALS = [
  { suffix: "KB", name: "Teclado HP" },
  { suffix: "MS", name: "Mouse HP" },
  { suffix: "MON", name: 'Monitor Dell 22"' },
]

/** Builds the peripheral equipment records shared by every workstation. */
function buildPeripherals(stations, num) {
  const list = []
  for (const ws of stations) {
    for (const p of PERIPHERALS) {
      list.push({
        id: `eq-${num}-${ws.code}-${p.suffix}`,
        laboratoryId: ws.laboratoryId,
        workstationId: ws.id,
        categoryId: EQ_CAT.PERIPHERAL,
        code: `EQ-${num}-${ws.code}-${p.suffix}`,
        name: p.name,
        status: WS_TO_EQUIP[ws.status] || "ACTIVE",
      })
    }
  }
  return list
}

function buildSeedWorkstations() {
  return [
    // LAB-101 — Programming Room 1 (30, 5 rows × 6 cols)
    ...buildStations("lab-1", "101", 30, 6, {
      overrides: { A3: "UNDER_MAINTENANCE", C4: "UNDER_MAINTENANCE", E6: "INACTIVE" },
    }),
    // LAB-102 — Programming Room 2 (25, 5 rows × 5 cols)
    ...buildStations("lab-2", "102", 25, 5, {
      overrides: { B2: "UNDER_MAINTENANCE" },
    }),
    // LAB-201 — Networking Room (20, 4 rows × 5 cols)
    ...buildStations("lab-3", "201", 20, 5, {
      overrides: { D5: "INACTIVE" },
    }),
    // LAB-202 — IT Infrastructure Room (18, all under maintenance)
    ...buildStations("lab-4", "202", 18, 6, { defaultStatus: "UNDER_MAINTENANCE" }),
    // LAB-103 — Database Room (28)
    ...buildStations("lab-6", "103", 28, 7),
    // AULA-301 — Main Lecture Hall has no workstations (theoretical classroom)
  ]
}

// Software presets per computer spec (backend: InstalledSoftware { name, version }).
const SOFTWARE = {
  hp: [
    { name: "Windows", version: "11 Pro" },
    { name: "Visual Studio Code", version: "1.90" },
    { name: "JDK", version: "21" },
    { name: "IntelliJ IDEA", version: "2024.1" },
    { name: "Git", version: "2.45" },
    { name: "PostgreSQL", version: "16" },
  ],
  dell: [
    { name: "Windows", version: "11 Pro" },
    { name: "Cisco Packet Tracer", version: "8.2" },
    { name: "Wireshark", version: "4.2" },
    { name: "PuTTY", version: "0.81" },
    { name: "GNS3", version: "2.2" },
  ],
  db: [
    { name: "Windows", version: "11 Pro" },
    { name: "PostgreSQL", version: "16" },
    { name: "MySQL Workbench", version: "8.0" },
    { name: "MongoDB Compass", version: "1.42" },
    { name: "DBeaver", version: "24.0" },
  ],
}

function buildSeedEquipment(workstations) {
  const wsFor = (labId) => workstations.filter((w) => w.laboratoryId === labId)

  const hpSpec = { name: "HP ProDesk 600 G6", software: "hp" }
  const dellSpec = { name: "Dell OptiPlex 7090", software: "dell" }
  const dbSpec = { name: "Lenovo ThinkCentre M75q", software: "db" }

  const computers = [
    ...buildComputers(wsFor("lab-1"), "101", hpSpec),
    ...buildComputers(wsFor("lab-2"), "102", hpSpec),
    ...buildComputers(wsFor("lab-3"), "201", dellSpec),
    ...buildComputers(wsFor("lab-6"), "103", dbSpec),
  ]

  // Every workstation also carries a set of peripherals (multi-equipment).
  const peripherals = [
    ...buildPeripherals(wsFor("lab-1"), "101"),
    ...buildPeripherals(wsFor("lab-2"), "102"),
    ...buildPeripherals(wsFor("lab-3"), "201"),
    ...buildPeripherals(wsFor("lab-6"), "103"),
  ]

  // Tag which software preset each computer uses (for installedSoftware seed).
  const softwareKeyById = new Map()
  wsFor("lab-1").forEach((w) => softwareKeyById.set(`eq-101-${w.code}`, "hp"))
  wsFor("lab-2").forEach((w) => softwareKeyById.set(`eq-102-${w.code}`, "hp"))
  wsFor("lab-3").forEach((w) => softwareKeyById.set(`eq-201-${w.code}`, "dell"))
  wsFor("lab-6").forEach((w) => softwareKeyById.set(`eq-103-${w.code}`, "db"))

  // Dedicated networking devices + projector (no workstation).
  const devices = [
    {
      id: "eq-201-SW1",
      laboratoryId: "lab-3",
      workstationId: null,
      categoryId: EQ_CAT.NETWORK,
      code: "NET-201-SW1",
      name: "Cisco Catalyst 2960-X",
      status: "ACTIVE",
    },
    {
      id: "eq-201-RT1",
      laboratoryId: "lab-3",
      workstationId: null,
      categoryId: EQ_CAT.NETWORK,
      code: "NET-201-RT1",
      name: "Cisco ISR 4321 Router",
      status: "UNDER_MAINTENANCE",
    },
    {
      id: "eq-301-P1",
      laboratoryId: "lab-5",
      workstationId: null,
      categoryId: EQ_CAT.PROJECTOR,
      code: "PRJ-301-01",
      name: "Epson PowerLite X49",
      status: "ACTIVE",
    },
  ]

  return { equipment: [...computers, ...peripherals, ...devices], softwareKeyById }
}

function buildSeedInstalledSoftware(computers, softwareKeyById) {
  const ts = nowISO()
  const list = []
  for (const eq of computers) {
    const key = softwareKeyById.get(eq.id)
    if (!key) continue
    SOFTWARE[key].forEach((s, i) => {
      list.push({
        id: `sw-${eq.id}-${i}`,
        equipmentId: eq.id,
        name: s.name,
        version: s.version,
        createdAt: ts,
        updatedAt: ts,
      })
    })
  }
  return list
}

function buildSeedIncidents() {
  return [
    {
      id: "inc-001",
      code: "INC-2026-001",
      laboratoryId: "lab-1",
      workstationId: "ws-101-A3",
      equipmentId: "eq-101-A3",
      typeId: INC_TYPE.INCIDENT,
      date: "2026-07-07T08:15:00Z",
      description: "The workstation at seat A3 does not power on at the start of class.",
      severity: "MAJOR",
      priority: "HIGH",
      status: "IN_PROGRESS",
      solution: null,
      createdAt: "2026-07-07T08:15:00Z",
      updatedAt: "2026-07-07T08:15:00Z",
    },
    {
      id: "inc-002",
      code: "INC-2026-002",
      laboratoryId: "lab-3",
      workstationId: null,
      equipmentId: "eq-201-RT1",
      typeId: INC_TYPE.INCIDENT,
      date: "2026-07-06T14:30:00Z",
      description: "Cisco ISR 4321 router shows intermittent connectivity on GigabitEthernet0/0/1.",
      severity: "CRITICAL",
      priority: "CRITICAL",
      status: "OPEN",
      solution: null,
      createdAt: "2026-07-06T14:30:00Z",
      updatedAt: "2026-07-06T14:30:00Z",
    },
    {
      id: "inc-003",
      code: "INC-2026-003",
      laboratoryId: "lab-1",
      workstationId: null,
      equipmentId: null,
      typeId: INC_TYPE.REQUEST,
      date: "2026-07-05T10:00:00Z",
      description: "Request to install Docker Desktop on all LAB-101 computers for the Software Architecture course.",
      severity: "MINOR",
      priority: "MEDIUM",
      status: "OPEN",
      solution: null,
      createdAt: "2026-07-05T10:00:00Z",
      updatedAt: "2026-07-05T10:00:00Z",
    },
    {
      id: "inc-004",
      code: "INC-2026-004",
      laboratoryId: "lab-4",
      workstationId: null,
      equipmentId: null,
      typeId: INC_TYPE.INCIDENT,
      date: "2026-07-01T09:00:00Z",
      description: "Laboratory air conditioning is out of service. Lab remains under maintenance until further notice.",
      severity: "MAJOR",
      priority: "HIGH",
      status: "IN_PROGRESS",
      solution: "Maintenance technician scheduled for July 10.",
      createdAt: "2026-07-01T09:00:00Z",
      updatedAt: "2026-07-01T09:00:00Z",
    },
  ]
}

// ── seed data (UCE) ──────────────────────────────────────────────────────────
function seed() {
  const ts = nowISO()
  const stamp = { createdAt: ts, updatedAt: ts }
  const workstations = buildSeedWorkstations()
  const { equipment, softwareKeyById } = buildSeedEquipment(workstations)
  const computers = equipment.filter((e) => e.categoryId === EQ_CAT.COMPUTER)
  return {
    _v: DB_VERSION,
    workstations,
    equipment,
    installedSoftware: buildSeedInstalledSoftware(computers, softwareKeyById),
    incidents: buildSeedIncidents(),
    laboratoryCategories: [
      { id: LAB_CAT.COMPUTING, name: "COMPUTING", description: "Laboratorios de cómputo general", ...stamp },
      { id: LAB_CAT.NETWORKS, name: "NETWORKS", description: "Redes y telecomunicaciones", ...stamp },
      { id: LAB_CAT.INDUSTRIAL, name: "INDUSTRIAL", description: "Infraestructura e industrial", ...stamp },
      { id: LAB_CAT.THEORETICAL, name: "THEORETICAL", description: "Aulas teóricas y magnas", ...stamp },
      { id: LAB_CAT.OTHER, name: "OTHER", description: "Otros espacios", ...stamp },
    ],
    equipmentCategories: [
      { id: EQ_CAT.COMPUTER, name: "Computador de escritorio", description: "Estaciones de trabajo", type: "COMPUTER", ...stamp },
      { id: EQ_CAT.NETWORK, name: "Dispositivo de red", description: "Switches, routers y APs", type: "NETWORK_DEVICE", ...stamp },
      { id: EQ_CAT.PROJECTOR, name: "Proyector", description: "Proyectores y periféricos", type: "PERIPHERAL", ...stamp },
      { id: EQ_CAT.PERIPHERAL, name: "Periférico", description: "Teclados, ratones, monitores y otros", type: "PERIPHERAL", ...stamp },
    ],
    incidentTypes: [
      { id: INC_TYPE.INCIDENT, name: "Incidencia", description: "Falla o problema reportado", ...stamp },
      { id: INC_TYPE.REQUEST, name: "Solicitud", description: "Solicitud de servicio o instalación", ...stamp },
    ],
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
      { id: "user-admin", firstName: "System", lastName: "Administrator", email: "admin@uce.edu.ec", role: "ADMIN", enabled: true, imageUrl: null, ...stamp },
      { id: "user-1", firstName: "Carlos", lastName: "Vásquez", email: "cvasquez@uce.edu.ec", role: "TEACHER", enabled: true, imageUrl: null, ...stamp },
      { id: "user-2", firstName: "María", lastName: "Jaramillo", email: "mjaramillo@uce.edu.ec", role: "TEACHER", enabled: true, imageUrl: null, ...stamp },
      { id: "user-3", firstName: "Luis", lastName: "Andrade", email: "landrade@uce.edu.ec", role: "TEACHER", enabled: true, imageUrl: null, ...stamp },
      { id: "user-4", firstName: "Ana", lastName: "Torres", email: "atorres@uce.edu.ec", role: "TEACHER", enabled: true, imageUrl: null, ...stamp },
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
      { id: "lab-1", facultyId: "fac-1", categoryId: LAB_CAT.COMPUTING, code: "LAB-101", name: "Programming Room 1", capacity: 30, status: "ACTIVE", ...stamp },
      { id: "lab-2", facultyId: "fac-1", categoryId: LAB_CAT.COMPUTING, code: "LAB-102", name: "Programming Room 2", capacity: 25, status: "ACTIVE", ...stamp },
      { id: "lab-3", facultyId: "fac-1", categoryId: LAB_CAT.NETWORKS, code: "LAB-201", name: "Networking and Telecommunications Room", capacity: 20, status: "ACTIVE", ...stamp },
      { id: "lab-4", facultyId: "fac-1", categoryId: LAB_CAT.INDUSTRIAL, code: "LAB-202", name: "IT Infrastructure Room", capacity: 18, status: "UNDER_MAINTENANCE", ...stamp },
      { id: "lab-5", facultyId: "fac-2", categoryId: LAB_CAT.THEORETICAL, code: "AULA-301", name: "Main Lecture Hall", capacity: 40, status: "ACTIVE", ...stamp },
      { id: "lab-6", facultyId: "fac-1", categoryId: LAB_CAT.COMPUTING, code: "LAB-103", name: "Database Room", capacity: 28, status: "CLOSED", ...stamp },
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

// ── Phase 2/3 lookups & summaries ──────────────────────────────────────────
const stationsOf = (labId) => db.workstations.filter((w) => eqId(w.laboratoryId, labId))
const equipmentOf = (labId) => db.equipment.filter((e) => eqId(e.laboratoryId, labId))
const incidentsOf = (labId) => db.incidents.filter((i) => eqId(i.laboratoryId, labId))
const softwareOf = (equipmentId) => db.installedSoftware.filter((s) => eqId(s.equipmentId, equipmentId))
const ACTIVE_INCIDENT = (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"

/** Compact inventory summary for the public status endpoint (null when no stations). */
function inventorySummaryFor(labId) {
  const ws = stationsOf(labId)
  if (!ws.length) return null
  return {
    totalWorkstations: ws.length,
    availableWorkstations: ws.filter((w) => w.status === "ACTIVE").length,
    underMaintenance: ws.filter((w) => w.status === "UNDER_MAINTENANCE").length,
    outOfService: ws.filter((w) => w.status === "INACTIVE").length,
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

/** Resolves an equipment category name (used to enrich public inventory only). */
const equipCategoryName = (id) => db.equipmentCategories.find((c) => eqId(c.id, id))?.name || null

/** Full inventory payload with equipment attached to each workstation. */
function inventoryResponse(labId) {
  const ws = stationsOf(labId)
  const eq = equipmentOf(labId)
  const withCat = (e) => (e ? { ...e, categoryName: equipCategoryName(e.categoryId) || e.categoryName || null } : null)
  const workstations = ws.map((w) => ({
    ...w,
    equipment: eq.filter((e) => eqId(e.workstationId, w.id)).map(withCat),
  }))
  const devices = eq.filter((e) => e.workstationId == null).map(withCat)
  return {
    laboratoryId: labId,
    totalWorkstations: ws.length,
    availableWorkstations: ws.filter((w) => w.status === "ACTIVE").length,
    underMaintenanceWorkstations: ws.filter((w) => w.status === "UNDER_MAINTENANCE").length,
    outOfServiceWorkstations: ws.filter((w) => w.status === "INACTIVE").length,
    totalEquipment: eq.length,
    operationalEquipment: eq.filter((e) => e.status === "ACTIVE").length,
    underMaintenanceEquipment: eq.filter((e) => e.status === "UNDER_MAINTENANCE").length,
    workstations,
    devices,
  }
}

/** Public-safe incident projection (new IncidentResponse shape). */
function publicIncident(i) {
  return {
    id: i.id,
    code: i.code,
    typeId: i.typeId,
    laboratoryId: i.laboratoryId,
    equipmentId: i.equipmentId,
    workstationId: i.workstationId,
    description: i.description,
    severity: i.severity,
    priority: i.priority,
    status: i.status,
    date: i.date,
    createdAt: i.createdAt,
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
    const found = db.users.find((u) => eqId(u.email, email)) || db.users.find((u) => u.role === "ADMIN")
    return {
      tokenType: "Bearer",
      accessToken: "mock-token",
      user: {
        id: found?.id || "user-admin",
        firstName: found?.firstName || "System",
        lastName: found?.lastName || "Administrator",
        email,
        role: found?.role || "ADMIN",
        enabled: true,
      },
    }
  }
  if (p === "/auth/logout") return null

  // Category / type catalogs --------------------------------------------------
  if (p === "/laboratory-categories") return crud("laboratoryCategories", method, null, body)
  m = p.match(/^\/laboratory-categories\/(.+)$/)
  if (m) return crud("laboratoryCategories", method, m[1], body)

  if (p === "/equipment-categories") return crud("equipmentCategories", method, null, body)
  m = p.match(/^\/equipment-categories\/(.+)$/)
  if (m) return crud("equipmentCategories", method, m[1], body)

  if (p === "/incident-types") return crud("incidentTypes", method, null, body)
  m = p.match(/^\/incident-types\/(.+)$/)
  if (m) return crud("incidentTypes", method, m[1], body)

  // Dashboard (authenticated summaries) ---------------------------------------
  if (p === "/dashboard/summary" && method === "GET") {
    const labs = db.laboratories
    return {
      totalLaboratories: labs.length,
      active: labs.filter((l) => l.status === "ACTIVE").length,
      underMaintenance: labs.filter((l) => l.status === "UNDER_MAINTENANCE").length,
      closed: labs.filter((l) => l.status === "CLOSED").length,
      openIncidents: db.incidents.filter((i) => i.status === "OPEN").length,
      inProgressIncidents: db.incidents.filter((i) => i.status === "IN_PROGRESS").length,
    }
  }
  if (p === "/dashboard/sessions/today" && method === "GET") {
    return route("GET", "/public/sessions/today", {}, null)
  }
  if (p === "/dashboard/laboratories/occupancy" && method === "GET") {
    const today = todayISO()
    const now = nowHM()
    return db.laboratories.map((lab) => {
      const inClass = db.sessions.some(
        (s) =>
          eqId(s.laboratoryId, lab.id) &&
          s.date === today &&
          s.status !== "CANCELLED" &&
          s.startTime.slice(0, 5) <= now &&
          now < s.endTime.slice(0, 5),
      )
      return { laboratoryId: lab.id, code: lab.code, status: lab.status, occupied: inClass }
    })
  }

  // Faculties -----------------------------------------------------------------
  m = p.match(/^\/faculties\/([^/]+)\/academic-programs$/)
  if (m && method === "GET") {
    return db.academicPrograms.filter((ap) => eqId(ap.facultyId, m[1]))
  }
  if (p === "/faculties") return crud("faculties", method, null, body)
  m = p.match(/^\/faculties\/(.+)$/)
  if (m) return crud("faculties", method, m[1], body)

  // Academic programs ---------------------------------------------------------
  m = p.match(/^\/academic-programs\/([^/]+)\/subjects$/)
  if (m && method === "GET") {
    return db.subjects.filter((s) => eqId(s.academicProgramId, m[1]))
  }
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

  m = p.match(/^\/academic-periods\/([^/]+)\/sessions\/generate$/)
  if (m && method === "POST") {
    return generateSessions(m[1])
  }
  m = p.match(/^\/academic-periods\/([^/]+)\/sessions\/generate-from-base-schedules$/)
  if (m && method === "POST") {
    return generateSessions(m[1], body?.baseScheduleIds || [])
  }
  m = p.match(/^\/academic-periods\/([^/]+)\/base-schedules$/)
  if (m && method === "GET") {
    return db.baseSchedules.filter((s) => eqId(s.academicPeriodId, m[1]))
  }
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
  m = p.match(/^\/users\/([^/]+)\/subject-assignments$/)
  if (m && method === "GET") {
    return db.teacherSubjectAssignments.filter((a) => eqId(a.teacherId, m[1]))
  }
  m = p.match(/^\/users\/([^/]+)\/base-schedules$/)
  if (m && method === "GET") {
    return db.baseSchedules.filter((s) => eqId(s.teacherId, m[1]))
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
  // User profile image (simulates Supabase Storage publicUrl with a data URL).
  m = p.match(/^\/users\/([^/]+)\/image$/)
  if (m) {
    const u = userOf(m[1])
    if (!u) notFound()
    if (method === "POST") {
      const MAX_BYTES = 2 * 1024 * 1024
      if (!body || !body.dataUrl) badRequest("No se recibió ningún archivo.")
      if (body.sizeBytes && body.sizeBytes > MAX_BYTES) badRequest("La imagen no debe superar los 2 MB.")
      const ts = nowISO()
      u.imageUrl = body.dataUrl
      u.image = {
        fileName: body.fileName || "photo",
        contentType: body.contentType || "image/*",
        sizeBytes: body.sizeBytes || null,
        storagePath: `users/${u.id}/${body.fileName || "photo"}`,
        publicUrl: body.dataUrl,
      }
      u.updatedAt = ts
      return { id: uid("img"), userId: u.id, ...u.image }
    }
    if (method === "GET") {
      if (!u.imageUrl || !u.image) notFound()
      return { id: `img-${u.id}`, userId: u.id, ...u.image }
    }
    if (method === "DELETE") {
      u.imageUrl = null
      u.image = null
      u.updatedAt = nowISO()
      return "Deleted successfully."
    }
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
        imageUrl: null,
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
  // Nested collections (must precede /laboratories/{id}).
  m = p.match(/^\/laboratories\/([^/]+)\/workstations$/)
  if (m && method === "GET") {
    if (!labOf(m[1])) notFound()
    return stationsOf(m[1])
  }
  m = p.match(/^\/laboratories\/([^/]+)\/equipment$/)
  if (m && method === "GET") {
    if (!labOf(m[1])) notFound()
    return equipmentOf(m[1])
  }
  m = p.match(/^\/laboratories\/([^/]+)\/incidents$/)
  if (m && method === "GET") {
    if (!labOf(m[1])) notFound()
    return incidentsOf(m[1]).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  }
  m = p.match(/^\/laboratories\/([^/]+)\/base-schedules$/)
  if (m && method === "GET") {
    return db.baseSchedules.filter((s) => eqId(s.laboratoryId, m[1]))
  }
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
      if (query.categoryId) list = list.filter((l) => eqId(l.categoryId, query.categoryId))
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
      return query.academicPeriodId
        ? db.baseSchedules.filter((s) => eqId(s.academicPeriodId, query.academicPeriodId))
        : db.baseSchedules
    }
    if (method === "POST") {
      const record = { ...body, id: uid("bs"), createdAt: nowISO(), updatedAt: nowISO() }
      db.baseSchedules.push(record)
      return record
    }
  }
  m = p.match(/^\/base-schedules\/(.+)$/)
  if (m) return crud("baseSchedules", method, m[1], body)

  // Sessions ------------------------------------------------------------------
  if (p === "/sessions" && method === "GET") {
    let list = db.sessions
    if (query.academicPeriodId) list = list.filter((s) => eqId(s.academicPeriodId, query.academicPeriodId))
    if (query.status) list = list.filter((s) => s.status === query.status)
    if (query.laboratoryId) list = list.filter((s) => eqId(s.laboratoryId, query.laboratoryId))
    if (query.date) list = list.filter((s) => s.date === query.date)
    return [...list].sort((a, b) =>
      a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
    )
  }
  m = p.match(/^\/sessions\/([^/]+)\/status$/)
  if (m && method === "PATCH") {
    const s = db.sessions.find((x) => eqId(x.id, m[1]))
    if (!s) notFound()
    s.status = body.status
    s.updatedAt = nowISO()
    return s
  }
  m = p.match(/^\/sessions\/([^/]+)\/teacher-attendance$/)
  if (m && method === "PATCH") {
    const s = db.sessions.find((x) => eqId(x.id, m[1]))
    if (!s) notFound()
    s.teacherAttendance = body.teacherAttendance
    s.updatedAt = nowISO()
    return s
  }
  m = p.match(/^\/sessions\/([^/]+)\/cancel$/)
  if (m && method === "PATCH") {
    const s = db.sessions.find((x) => eqId(x.id, m[1]))
    if (!s) notFound()
    s.status = "CANCELLED"
    s.updatedAt = nowISO()
    return s
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
  m = p.match(/^\/equipment\/([^/]+)\/installed-software$/)
  if (m && method === "GET") {
    return softwareOf(m[1])
  }
  if (p === "/equipment") {
    if (method === "GET") {
      let list = db.equipment
      if (query.laboratoryId) list = list.filter((e) => eqId(e.laboratoryId, query.laboratoryId))
      if (query.workstationId) list = list.filter((e) => eqId(e.workstationId, query.workstationId))
      return list
    }
    if (method === "POST") {
      const ws = body.workstationId ? db.workstations.find((w) => eqId(w.id, body.workstationId)) : null
      const laboratoryId = ws ? ws.laboratoryId : body.laboratoryId || null
      const lab = laboratoryId ? db.laboratories.find((l) => eqId(l.id, laboratoryId)) : null
      const labNum = lab ? lab.code.replace(/^[^0-9]+/, "") || lab.code : "GEN"
      const seq = db.equipment.filter((e) => eqId(e.laboratoryId, laboratoryId)).length + 1
      const ts = nowISO()
      const record = {
        id: uid("eq"),
        laboratoryId,
        workstationId: body.workstationId || null,
        categoryId: body.categoryId || null,
        // Free-text category (used when "Other…" is chosen without a catalog id).
        categoryName: body.categoryName || null,
        code: `EQ-${labNum}-${String(seq).padStart(3, "0")}`,
        name: body.name || "",
        status: body.status || "ACTIVE",
        createdAt: ts,
        updatedAt: ts,
      }
      db.equipment.push(record)
      return record
    }
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
    if (body.solution !== undefined) inc.solution = body.solution
    inc.updatedAt = nowISO()
    return inc
  }
  if (p === "/incidents") {
    if (method === "GET") {
      let list = db.incidents
      if (query.laboratoryId) list = list.filter((i) => eqId(i.laboratoryId, query.laboratoryId))
      if (query.status) list = list.filter((i) => i.status === query.status)
      if (query.priority) list = list.filter((i) => i.priority === query.priority)
      return [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    }
    if (method === "POST") {
      const year = new Date().getFullYear()
      const nextNum = db.incidents.length + 1
      const ts = nowISO()
      const record = {
        id: uid("inc"),
        code: `INC-${year}-${String(nextNum).padStart(3, "0")}`,
        laboratoryId: body.laboratoryId,
        workstationId: body.workstationId || null,
        equipmentId: body.equipmentId || null,
        typeId: body.typeId || INC_TYPE.INCIDENT,
        date: ts,
        description: body.description || "",
        severity: body.severity || "MINOR",
        priority: body.priority || "MEDIUM",
        status: "OPEN",
        solution: null,
        createdAt: ts,
        updatedAt: ts,
      }
      db.incidents.push(record)
      return record
    }
  }
  m = p.match(/^\/incidents\/(.+)$/)
  if (m) return crud("incidents", method, m[1], body)

  // Public (no auth) ----------------------------------------------------------
  if (p === "/public/faculties" && method === "GET") return db.faculties
  if (p === "/public/subjects" && method === "GET") return db.subjects
  if (p === "/public/laboratory-categories" && method === "GET") return db.laboratoryCategories
  m = p.match(/^\/public\/faculties\/([^/]+)\/academic-programs$/)
  if (m && method === "GET") {
    return db.academicPrograms.filter((ap) => eqId(ap.facultyId, m[1]))
  }
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
      .map(publicIncident)
  }
  if (p === "/public/laboratories/status" && method === "GET") {
    const now = nowHM()
    const today = todayISO()
    let labs = db.laboratories
    if (query.facultyId) labs = labs.filter((l) => eqId(l.facultyId, query.facultyId))
    const todaySessions = db.sessions.filter((s) => s.date === today)

    const buildSession = (s, withStudents) => {
      if (!s) return null
      const teacher = userOf(s.teacherId)
      const base = {
        subject: subjectOf(s.subjectId)?.name ?? null,
        teacherId: s.teacherId ?? null,
        teacher: fullName(teacher) ?? null,
        teacherImageUrl: teacher?.imageUrl ?? null,
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
        categoryId: lab.categoryId,
        code: lab.code,
        name: lab.name,
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
        const teacher = userOf(s.teacherId)
        return {
          id: s.id,
          subjectId: s.subjectId,
          laboratoryId: s.laboratoryId,
          teacherId: s.teacherId,
          subject: subjectOf(s.subjectId)?.name ?? null,
          teacher: fullName(teacher) ?? null,
          teacherImageUrl: teacher?.imageUrl ?? null,
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
        created.push(record)
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return created
}

/**
 * Entry point used by the API client. Mirrors apiFetch's signature/return.
 */
/** Reads a File/Blob as a base64 data URL (simulates Supabase Storage publicUrl). */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function mockApiFetch(path, options = {}) {
  await delay()
  const method = (options.method || "GET").toUpperCase()
  let body = options.body
  // Multipart uploads (FormData with a `file` field) → normalize to a plain object.
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const file = body.get("file")
    if (file && typeof file !== "string") {
      body = {
        dataUrl: await fileToDataUrl(file),
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }
    } else {
      body = {}
    }
  } else if (typeof body === "string") {
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
