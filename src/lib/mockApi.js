/**
 * ──────────────────────────────────────────────────────────────────────────
 *  MOCK BACKEND (DEMO MODE)
 * ──────────────────────────────────────────────────────────────────────────
 *  This module simulates the REST API in-memory so the entire application can
 *  be tested without a running backend. It mirrors the same endpoints, request
 *  shapes and response shapes the real Spring backend is expected to expose.
 *
 *  Data is seeded with realistic Universidad Central del Ecuador (UCE) content
 *  and persisted to localStorage so changes survive page refreshes.
 *
 *  ➜ To switch to the REAL backend: set USE_MOCK = false in src/lib/api.js
 *  ➜ To reset demo data: run  window.__siglaResetMock()  in the browser console
 */

const DB_KEY = "sigla_mock_db"
const DB_VERSION = 2 // bump to force a reseed when the seed shape changes

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
// Deterministic pseudo attendance so the public view is stable across refreshes.
function pseudoStudents(seedNum, capacidad) {
  const pct = 0.45 + ((Number(seedNum) * 17) % 50) / 100 // 0.45–0.95
  return Math.min(capacidad, Math.max(1, Math.round(capacidad * pct)))
}

const DAY_NUM = { LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 0 }

// ── seed data (UCE) ──────────────────────────────────────────────────────────
function seed() {
  return {
    _v: DB_VERSION,
    faculties: [
      { id: 1, nombre: "Facultad de Ingeniería y Ciencias Aplicadas" },
      { id: 2, nombre: "Facultad de Ciencias Médicas" },
      { id: 3, nombre: "Facultad de Ciencias Económicas" },
    ],
    careers: [
      { id: 1, nombre: "Ingeniería en Sistemas de Información", facultadId: 1 },
      { id: 2, nombre: "Ingeniería en Computación", facultadId: 1 },
      { id: 3, nombre: "Medicina", facultadId: 2 },
      { id: 4, nombre: "Economía", facultadId: 3 },
    ],
    subjects: [
      { id: 1, nombre: "Programación I", carreraId: 1 },
      { id: 2, nombre: "Estructura de Datos", carreraId: 1 },
      { id: 3, nombre: "Bases de Datos", carreraId: 1 },
      { id: 4, nombre: "Redes de Computadores", carreraId: 2 },
      { id: 5, nombre: "Sistemas Operativos", carreraId: 2 },
      { id: 6, nombre: "Anatomía Humana", carreraId: 3 },
      { id: 7, nombre: "Microeconomía", carreraId: 4 },
    ],
    teachers: [
      { id: 1, nombre: "Ing. Carlos Vásquez", correo: "cvasquez@uce.edu.ec", materiasAsignadas: [1, 2] },
      { id: 2, nombre: "Ing. María Jaramillo", correo: "mjaramillo@uce.edu.ec", materiasAsignadas: [3, 4] },
      { id: 3, nombre: "Ing. Luis Andrade", correo: "landrade@uce.edu.ec", materiasAsignadas: [5] },
      { id: 4, nombre: "Dra. Ana Torres", correo: "atorres@uce.edu.ec", materiasAsignadas: [6] },
    ],
    teacherSubjects: [
      { id: 1, teacherId: 1, subjectId: 1 },
      { id: 2, teacherId: 1, subjectId: 2 },
      { id: 3, teacherId: 2, subjectId: 3 },
      { id: 4, teacherId: 2, subjectId: 4 },
      { id: 5, teacherId: 3, subjectId: 5 },
      { id: 6, teacherId: 4, subjectId: 6 },
    ],
    periods: [
      { id: 1, nombre: "2024-II", fechaInicio: "2024-10-01", fechaFin: "2025-02-28", estado: "CERRADO" },
      { id: 2, nombre: "2025-I", fechaInicio: "2025-04-01", fechaFin: "2025-08-31", estado: "ACTIVO" },
    ],
    laboratories: [
      { id: 1, codigo: "LAB-101", nombre: "Laboratorio de Cómputo 1", tipo: "COMPUTO", capacidadMaxima: 30, estado: "ACTIVO" },
      { id: 2, codigo: "LAB-102", nombre: "Laboratorio de Cómputo 2", tipo: "COMPUTO", capacidadMaxima: 25, estado: "ACTIVO" },
      { id: 3, codigo: "LAB-201", nombre: "Laboratorio de Redes", tipo: "REDES", capacidadMaxima: 20, estado: "ACTIVO" },
      { id: 4, codigo: "LAB-202", nombre: "Laboratorio Industrial", tipo: "INDUSTRIAL", capacidadMaxima: 18, estado: "EN_MANTENIMIENTO" },
      { id: 5, codigo: "AULA-301", nombre: "Aula Teórica 1", tipo: "TEORICO", capacidadMaxima: 40, estado: "ACTIVO" },
      { id: 6, codigo: "LAB-103", nombre: "Laboratorio de Cómputo 3", tipo: "COMPUTO", capacidadMaxima: 28, estado: "CERRADO" },
    ],
    baseSchedules: [
      { id: 1, periodoId: 2, laboratorioId: 1, docenteId: 1, materiaId: 1, diaSemana: "LUNES", horaInicio: "08:00:00", horaFin: "10:00:00" },
      { id: 2, periodoId: 2, laboratorioId: 2, docenteId: 1, materiaId: 2, diaSemana: "LUNES", horaInicio: "10:00:00", horaFin: "12:00:00" },
      { id: 3, periodoId: 2, laboratorioId: 3, docenteId: 2, materiaId: 4, diaSemana: "MARTES", horaInicio: "09:00:00", horaFin: "11:00:00" },
      { id: 4, periodoId: 2, laboratorioId: 1, docenteId: 2, materiaId: 3, diaSemana: "MIERCOLES", horaInicio: "14:00:00", horaFin: "16:00:00" },
      { id: 5, periodoId: 2, laboratorioId: 2, docenteId: 3, materiaId: 5, diaSemana: "JUEVES", horaInicio: "08:00:00", horaFin: "10:00:00" },
      { id: 6, periodoId: 2, laboratorioId: 3, docenteId: 1, materiaId: 1, diaSemana: "VIERNES", horaInicio: "11:00:00", horaFin: "13:00:00" },
    ],
    sessions: [
      { id: 1, periodoId: 2, fecha: todayISO(), horaInicio: "08:00:00", horaFin: "10:00:00", materiaId: 1, laboratorioId: 1, docenteId: 1, estado: "FINALIZADA", asistenciaDocente: "LLEGO" },
      { id: 2, periodoId: 2, fecha: todayISO(), horaInicio: "10:00:00", horaFin: "12:00:00", materiaId: 4, laboratorioId: 3, docenteId: 2, estado: "EN_CURSO", asistenciaDocente: null },
      { id: 3, periodoId: 2, fecha: todayISO(), horaInicio: "14:00:00", horaFin: "16:00:00", materiaId: 3, laboratorioId: 1, docenteId: 2, estado: "PROGRAMADA", asistenciaDocente: null },
      { id: 4, periodoId: 2, fecha: shiftISO(1), horaInicio: "08:00:00", horaFin: "10:00:00", materiaId: 2, laboratorioId: 2, docenteId: 1, estado: "PROGRAMADA", asistenciaDocente: null },
      { id: 5, periodoId: 2, fecha: shiftISO(1), horaInicio: "09:00:00", horaFin: "11:00:00", materiaId: 5, laboratorioId: 2, docenteId: 3, estado: "PROGRAMADA", asistenciaDocente: null },
      { id: 6, periodoId: 2, fecha: shiftISO(-1), horaInicio: "11:00:00", horaFin: "13:00:00", materiaId: 1, laboratorioId: 3, docenteId: 1, estado: "FINALIZADA", asistenciaDocente: "RETRASO" },
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
const nextId = (list) => (list.length ? Math.max(...list.map((x) => Number(x.id) || 0)) + 1 : 1)
const numOrSelf = (v) => (v !== "" && v != null && !Number.isNaN(Number(v)) ? Number(v) : v)

function notFound() {
  const err = new Error("Recurso no encontrado (mock).")
  err.status = 404
  throw err
}

const labOf = (id) => db.laboratories.find((l) => eqId(l.id, id))
const subjectOf = (id) => db.subjects.find((s) => eqId(s.id, id))
const teacherOf = (id) => db.teachers.find((t) => eqId(t.id, id))

function enrich(record) {
  const lab = labOf(record.laboratorioId)
  const mat = subjectOf(record.materiaId)
  const doc = teacherOf(record.docenteId)
  return {
    ...record,
    materiaNombre: mat?.nombre,
    laboratorioNombre: lab?.nombre,
    laboratorioCodigo: lab?.codigo,
    docenteNombre: doc?.nombre,
  }
}

// Generic CRUD collection handler.
function crud(collection, method, id, body) {
  const list = db[collection]
  if (method === "GET") return list
  if (method === "POST") {
    const record = { ...body, id: nextId(list) }
    list.push(record)
    return record
  }
  if (method === "PUT" || method === "PATCH") {
    const idx = list.findIndex((x) => eqId(x.id, id))
    if (idx === -1) notFound()
    list[idx] = { ...list[idx], ...body, id: list[idx].id }
    return list[idx]
  }
  if (method === "DELETE") {
    const idx = list.findIndex((x) => eqId(x.id, id))
    if (idx === -1) notFound()
    list.splice(idx, 1)
    return null
  }
  notFound()
}

// ── router ───────────────────────────────────────────────────────────────────
function route(method, path, query, body) {
  // strip a single trailing slash
  const p = path.replace(/\/$/, "")

  // Auth ----------------------------------------------------------------------
  if (p === "/auth/login" && method === "POST") {
    return {
      accessToken: "mock-token",
      user: { nombre: "Administrador", apellido: "UCE", email: body?.email || "admin@uce.edu.ec", rol: "Administrador" },
    }
  }
  if (p === "/auth/logout") return null

  // Academic: periods ---------------------------------------------------------
  if (p === "/academic/periods") return crud("periods", method, null, body)
  let m = p.match(/^\/academic\/periods\/(.+)$/)
  if (m) return crud("periods", method, m[1], body)

  // Academic: faculties -------------------------------------------------------
  if (p === "/academic/faculties") return crud("faculties", method, null, body)
  m = p.match(/^\/academic\/faculties\/(.+)$/)
  if (m) return crud("faculties", method, m[1], body)

  // Academic: careers ---------------------------------------------------------
  if (p === "/academic/careers") return crud("careers", method, null, body)
  m = p.match(/^\/academic\/careers\/(.+)$/)
  if (m) return crud("careers", method, m[1], body)

  // Academic: subjects --------------------------------------------------------
  if (p === "/academic/subjects") return crud("subjects", method, null, body)
  m = p.match(/^\/academic\/subjects\/(.+)$/)
  if (m) return crud("subjects", method, m[1], body)

  // Academic: teacher-subjects (assignments) ----------------------------------
  if (p === "/academic/teacher-subjects") {
    if (method === "GET") {
      const tid = query.teacherId
      return db.teacherSubjects.filter((a) => eqId(a.teacherId, tid))
    }
    if (method === "POST") {
      const teacherId = numOrSelf(body.teacherId)
      const subjectId = numOrSelf(body.subjectId)
      const record = { id: nextId(db.teacherSubjects), teacherId, subjectId }
      db.teacherSubjects.push(record)
      const teacher = teacherOf(teacherId)
      if (teacher) {
        teacher.materiasAsignadas = teacher.materiasAsignadas || []
        if (!teacher.materiasAsignadas.some((x) => eqId(x, subjectId))) teacher.materiasAsignadas.push(subjectId)
      }
      return record
    }
  }
  m = p.match(/^\/academic\/teacher-subjects\/(.+)$/)
  if (m && method === "DELETE") {
    const idx = db.teacherSubjects.findIndex((a) => eqId(a.id, m[1]))
    if (idx === -1) notFound()
    const removed = db.teacherSubjects.splice(idx, 1)[0]
    const teacher = teacherOf(removed.teacherId)
    if (teacher && teacher.materiasAsignadas) {
      teacher.materiasAsignadas = teacher.materiasAsignadas.filter((x) => !eqId(x, removed.subjectId))
    }
    return null
  }

  // Academic: teachers --------------------------------------------------------
  if (p === "/academic/teachers") {
    if (method === "POST") {
      const record = { ...body, id: nextId(db.teachers), materiasAsignadas: [] }
      db.teachers.push(record)
      return record
    }
    return crud("teachers", method, null, body)
  }
  m = p.match(/^\/academic\/teachers\/(.+)$/)
  if (m) {
    if (method === "DELETE") {
      // also clean up assignments for this teacher
      db.teacherSubjects = db.teacherSubjects.filter((a) => !eqId(a.teacherId, m[1]))
    }
    return crud("teachers", method, m[1], body)
  }

  // Laboratories --------------------------------------------------------------
  if (p === "/laboratories") return crud("laboratories", method, null, body)
  m = p.match(/^\/laboratories\/(.+)$/)
  if (m) return crud("laboratories", method, m[1], body)

  // Base schedules ------------------------------------------------------------
  if (p === "/base-schedules") {
    if (method === "GET") {
      const list = query.periodoId
        ? db.baseSchedules.filter((s) => eqId(s.periodoId, query.periodoId))
        : db.baseSchedules
      return list.map(enrich)
    }
    if (method === "POST") {
      const record = { ...body, id: nextId(db.baseSchedules) }
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
  if (p === "/sessions/generate" && method === "POST") {
    const { periodoId, fechaInicio, fechaFin } = body
    // Remove existing sessions in this period within the range, then regenerate.
    db.sessions = db.sessions.filter((s) => {
      if (!eqId(s.periodoId, periodoId)) return true
      return s.fecha < fechaInicio || s.fecha > fechaFin
    })
    const schedules = db.baseSchedules.filter((s) => eqId(s.periodoId, periodoId))
    let count = 0
    const [sy, sm, sd] = fechaInicio.split("-").map(Number)
    const [ey, em, ed] = fechaFin.split("-").map(Number)
    const cursor = new Date(sy, sm - 1, sd)
    const end = new Date(ey, em - 1, ed)
    while (cursor <= end) {
      const weekday = cursor.getDay()
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
      for (const sch of schedules) {
        if (DAY_NUM[sch.diaSemana] === weekday) {
          db.sessions.push({
            id: nextId(db.sessions),
            periodoId: numOrSelf(periodoId),
            fecha: iso,
            horaInicio: sch.horaInicio,
            horaFin: sch.horaFin,
            materiaId: sch.materiaId,
            laboratorioId: sch.laboratorioId,
            docenteId: sch.docenteId,
            estado: "PROGRAMADA",
            asistenciaDocente: null,
          })
          count += 1
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return { generadas: count }
  }

  if (p === "/sessions" && method === "GET") {
    let list = db.sessions
    if (query.periodoId) list = list.filter((s) => eqId(s.periodoId, query.periodoId))
    if (query.estado) list = list.filter((s) => s.estado === query.estado)
    if (query.laboratorioId) list = list.filter((s) => eqId(s.laboratorioId, query.laboratorioId))
    if (query.fecha) list = list.filter((s) => s.fecha === query.fecha)
    // newest first by date then start time
    list = [...list].sort((a, b) => (a.fecha === b.fecha ? a.horaInicio.localeCompare(b.horaInicio) : a.fecha.localeCompare(b.fecha)))
    return list.map(enrich)
  }
  m = p.match(/^\/sessions\/(.+)\/estado$/)
  if (m && method === "PATCH") {
    const s = db.sessions.find((x) => eqId(x.id, m[1]))
    if (!s) notFound()
    s.estado = body.estado
    return enrich(s)
  }
  m = p.match(/^\/sessions\/(.+)\/asistencia$/)
  if (m && method === "PATCH") {
    const s = db.sessions.find((x) => eqId(x.id, m[1]))
    if (!s) notFound()
    s.asistenciaDocente = body.asistenciaDocente
    return enrich(s)
  }

  // Dashboard -----------------------------------------------------------------
  if (p === "/dashboard/summary") {
    const labs = db.laboratories
    return {
      totalLaboratories: labs.length,
      active: labs.filter((l) => l.estado === "ACTIVO").length,
      maintenance: labs.filter((l) => l.estado === "EN_MANTENIMIENTO").length,
      closed: labs.filter((l) => l.estado === "CERRADO").length,
    }
  }
  if (p === "/dashboard/today-sessions") {
    return db.sessions
      .filter((s) => s.fecha === todayISO())
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .map(enrich)
  }
  if (p === "/dashboard/laboratory-occupancy") {
    // Sample occupancy for active labs.
    const sample = { 1: 24, 2: 0, 3: 18, 5: 35 }
    return db.laboratories
      .filter((l) => l.estado === "ACTIVO")
      .map((l) => ({
        id: l.id,
        nombre: l.nombre,
        codigo: l.codigo,
        capacidadMaxima: l.capacidadMaxima,
        ocupados: sample[l.id] ?? 0,
      }))
  }

  // Public (no auth) ----------------------------------------------------------
  if (p === "/public/laboratories/status" && method === "GET") {
    const now = nowHM()
    const today = todayISO()
    const todaySessions = db.sessions.filter((s) => s.fecha === today)

    const buildSesion = (s, lab, withStudents) => {
      if (!s) return null
      const doc = teacherOf(s.docenteId)
      const mat = subjectOf(s.materiaId)
      const base = {
        materia: mat?.nombre ?? null,
        docente: doc?.nombre ?? null,
        horaInicio: s.horaInicio.slice(0, 5),
        horaFin: s.horaFin.slice(0, 5),
      }
      if (withStudents) {
        base.totalEstudiantes = pseudoStudents(s.id, lab.capacidadMaxima)
        base.estadoSesion = s.estado
      }
      return base
    }

    return db.laboratories.map((lab) => {
      const labSessions = todaySessions
        .filter((s) => eqId(s.laboratorioId, lab.id) && s.estado !== "CANCELADA")
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      const current =
        lab.estado === "ACTIVO"
          ? labSessions.find(
              (s) =>
                s.estado === "EN_CURSO" ||
                (s.horaInicio.slice(0, 5) <= now && now < s.horaFin.slice(0, 5)),
            )
          : null
      const next = labSessions.find((s) => s.horaInicio.slice(0, 5) > now && !eqId(s.id, current?.id))

      return {
        id: lab.id,
        codigo: lab.codigo,
        nombre: lab.nombre,
        tipo: lab.tipo,
        capacidadMaxima: lab.capacidadMaxima,
        estado: lab.estado,
        sesionActual: buildSesion(current, lab, true),
        proximaSesion: buildSesion(next, lab, false),
      }
    })
  }

  if (p === "/public/sessions/today" && method === "GET") {
    const today = todayISO()
    return db.sessions
      .filter((s) => s.fecha === today)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .map((s) => {
        const lab = labOf(s.laboratorioId)
        const doc = teacherOf(s.docenteId)
        const mat = subjectOf(s.materiaId)
        return {
          id: s.id,
          materia: mat?.nombre ?? null,
          docente: doc?.nombre ?? null,
          laboratorio: lab?.nombre ?? null,
          codigoLab: lab?.codigo ?? null,
          horaInicio: s.horaInicio.slice(0, 5),
          horaFin: s.horaFin.slice(0, 5),
          totalEstudiantes: lab ? pseudoStudents(s.id, lab.capacidadMaxima) : 0,
          estado: s.estado,
        }
      })
  }

  // Fallback ------------------------------------------------------------------
  notFound()
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
