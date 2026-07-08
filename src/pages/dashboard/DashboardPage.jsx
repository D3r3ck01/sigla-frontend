import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  FlaskConical,
  CircleCheck,
  Wrench,
  CircleX,
  RefreshCw,
  Clock,
  User,
  CalendarClock,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  X,
} from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { usePeriod } from "../../context/PeriodContext"
import { PageHeader } from "../../components/PageHeader"
import { KpiCard } from "../../components/KpiCard"
import { Card, CardHeader, CardBody } from "../../components/Card"
import { Button } from "../../components/Button"
import { StatusBadge } from "../../components/Badge"
import { Select } from "../../components/Field"
import { formatTime } from "../../lib/utils"
import { LabStatusCard } from "../public/LabStatusCard"
import { priorityMeta, relativeTime } from "../../lib/labUi"

const todayISO = () => new Date().toISOString().slice(0, 10)
const ACTIVE = (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"

// Lazy loaders for the card's expandable panel (admin, authenticated).
async function fetchLabInventory(labId) {
  const [wsData, eqData] = await Promise.all([
    api.get(`/workstations?laboratoryId=${labId}`).catch(() => []),
    api.get(`/equipment?laboratoryId=${labId}`).catch(() => []),
  ])
  const equipment = asList(eqData)
  const workstations = asList(wsData).map((w) => ({
    ...w,
    equipment: equipment.find((e) => String(e.workstationId) === String(w.id)) || null,
  }))
  const devices = equipment.filter((e) => e.workstationId == null)
  return { workstations, devices }
}

async function fetchLabIncidents(labId) {
  const list = await api.get(`/incidents?laboratoryId=${labId}`).catch(() => [])
  return asList(list).filter(ACTIVE)
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { selectedId: academicPeriodId, selected } = usePeriod()

  const [facultyId, setFacultyId] = useState("")
  const [programId, setProgramId] = useState("")
  const [careersByFaculty, setCareersByFaculty] = useState([])

  const loadAll = useCallback(async () => {
    const [faculties, labs, subjects, sessions, openInc, progInc] = await Promise.all([
      api.get("/faculties").catch(() => []),
      api.get("/laboratories").catch(() => []),
      api.get("/subjects").catch(() => []),
      academicPeriodId
        ? api.get(`/sessions?academicPeriodId=${academicPeriodId}&date=${todayISO()}`).catch(() => [])
        : Promise.resolve([]),
      api.get("/incidents?status=OPEN").catch(() => []),
      api.get("/incidents?status=IN_PROGRESS").catch(() => []),
    ])
    return {
      allFaculties: asList(faculties),
      allLabs: asList(labs),
      allSubjects: asList(subjects),
      todaySessions: asList(sessions),
      activeIncidents: [...asList(openInc), ...asList(progInc)],
    }
  }, [academicPeriodId])

  const { data, loading, refetch } = useAsync(loadAll, [academicPeriodId])
  const allFaculties = data?.allFaculties || []
  const allLabs = data?.allLabs || []
  const allSubjects = data?.allSubjects || []
  const todaySessions = data?.todaySessions || []
  const activeIncidents = data?.activeIncidents || []

  // Cascading academic programs when a faculty is selected.
  useEffect(() => {
    if (!facultyId) {
      setCareersByFaculty([])
      setProgramId("")
      return
    }
    api
      .get(`/faculties/${facultyId}/academic-programs`)
      .then((d) => setCareersByFaculty(asList(d)))
      .catch(() => setCareersByFaculty([]))
  }, [facultyId])

  const labFacultyMap = useMemo(() => {
    const map = new Map()
    for (const l of allLabs) map.set(l.id, l.facultyId)
    return map
  }, [allLabs])

  const subjectProgramMap = useMemo(() => {
    const map = new Map()
    for (const s of allSubjects) map.set(s.id, s.academicProgramId)
    return map
  }, [allSubjects])

  const filteredLabs = useMemo(() => {
    if (!facultyId) return allLabs
    return allLabs.filter((l) => String(l.facultyId) === String(facultyId))
  }, [allLabs, facultyId])

  const filteredSessions = useMemo(() => {
    return todaySessions.filter((s) => {
      if (facultyId && String(labFacultyMap.get(s.laboratoryId)) !== String(facultyId)) return false
      if (programId && String(subjectProgramMap.get(s.subjectId)) !== String(programId)) return false
      return true
    })
  }, [todaySessions, facultyId, programId, labFacultyMap, subjectProgramMap])

  const summary = useMemo(
    () => ({
      totalLaboratories: filteredLabs.length,
      active: filteredLabs.filter((l) => l.status === "ACTIVE").length,
      maintenance: filteredLabs.filter((l) => l.status === "UNDER_MAINTENANCE").length,
      closed: filteredLabs.filter((l) => l.status === "CLOSED").length,
    }),
    [filteredLabs],
  )

  // Group active incidents by lab and build a compact summary per lab.
  const incidentsByLab = useMemo(() => {
    const map = new Map()
    for (const inc of activeIncidents) {
      const arr = map.get(inc.laboratoryId) || []
      arr.push(inc)
      map.set(inc.laboratoryId, arr)
    }
    return map
  }, [activeIncidents])

  function incidentSummaryFor(labId) {
    const list = incidentsByLab.get(labId) || []
    return {
      openIncidents: list.filter((i) => i.status === "OPEN").length,
      inProgressIncidents: list.filter((i) => i.status === "IN_PROGRESS").length,
      criticalIncidents: list.filter((i) => i.priority === "CRITICAL").length,
    }
  }

  // Lab objects enriched for the compact card (current session from today's sessions).
  const cardLabs = useMemo(() => {
    return filteredLabs.map((lab) => {
      const current = filteredSessions.find(
        (s) => String(s.laboratoryId) === String(lab.id) && s.status === "IN_PROGRESS",
      )
      const currentSession = current
        ? {
            subject: current.subjectName || "Materia",
            teacher: current.teacherName || "Docente",
            startTime: formatTime(current.startTime),
            endTime: formatTime(current.endTime),
            totalStudents: current.registeredStudentCount ?? 0,
          }
        : null
      return { ...lab, currentSession, inventorySummary: null, incidentSummary: incidentSummaryFor(lab.id) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLabs, filteredSessions, incidentsByLab])

  // Operational alerts: HIGH + CRITICAL active incidents (max 5).
  const alerts = useMemo(() => {
    const labName = (id) => allLabs.find((l) => String(l.id) === String(id))
    return activeIncidents
      .filter((i) => i.priority === "HIGH" || i.priority === "CRITICAL")
      .filter((i) => !facultyId || String(labFacultyMap.get(i.laboratoryId)) === String(facultyId))
      .sort((a, b) => {
        const order = { CRITICAL: 0, HIGH: 1 }
        if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority]
        return String(b.createdAt).localeCompare(String(a.createdAt))
      })
      .map((i) => {
        const lab = labName(i.laboratoryId)
        return { ...i, labCode: lab?.code, labName: lab?.name }
      })
  }, [activeIncidents, allLabs, facultyId, labFacultyMap])

  const selectedFaculty = allFaculties.find((f) => String(f.id) === String(facultyId))
  const selectedProgram = careersByFaculty.find((p) => String(p.id) === String(programId))
  const hasActiveFilter = Boolean(facultyId)

  function clearFilters() {
    setFacultyId("")
    setProgramId("")
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen general del estado de los laboratorios y la actividad del día."
        actions={
          <Button variant="secondary" onClick={() => refetch()} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      {/* Filters top bar */}
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Periodo</label>
            <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm text-foreground sm:w-44">
              {selected?.name || "Sin periodo"}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Facultad</label>
            <Select
              value={facultyId}
              onChange={(e) => {
                setFacultyId(e.target.value)
                setProgramId("")
              }}
              className="sm:w-56"
              aria-label="Filtrar por facultad"
            >
              <option value="">Todas</option>
              {allFaculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Carrera</label>
            <Select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              disabled={!facultyId}
              className="sm:w-56"
              aria-label="Filtrar por carrera"
            >
              <option value="">Todas</option>
              {careersByFaculty.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Active filter banner */}
      {hasActiveFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2.5 text-sm text-[#003B7A]">
          <span className="font-medium">Mostrando resultados para:</span>
          <span className="inline-flex items-center rounded-full bg-[#003B7A]/10 px-2.5 py-0.5 font-semibold">
            {selectedFaculty?.name || "Facultad"}
          </span>
          {selectedProgram && (
            <>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="inline-flex items-center rounded-full bg-[#003B7A]/10 px-2.5 py-0.5 font-semibold">
                {selectedProgram.name}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[#003B7A]/20 px-2.5 py-1 text-xs font-medium hover:bg-[#003B7A]/5"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Limpiar
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={FlaskConical} label="Total de laboratorios" value={summary.totalLaboratories} accent="blue" loading={loading} />
        <KpiCard icon={CircleCheck} label="Activos" value={summary.active} accent="green" loading={loading} />
        <KpiCard icon={Wrench} label="En mantenimiento" value={summary.maintenance} accent="orange" loading={loading} />
        <KpiCard icon={CircleX} label="Cerrados" value={summary.closed} accent="red" loading={loading} />
      </div>

      {/* Operational alerts */}
      {!loading && alerts.length > 0 && (
        <Card className="mt-6 border-l-4 border-l-[#C8102E]">
          <CardHeader
            title={
              <span className="flex items-center gap-2 text-[#B91C1C]">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Alertas operativas
              </span>
            }
            subtitle={`${alerts.length} incidencia(s) de prioridad alta o crítica`}
          />
          <CardBody className="space-y-2">
            {alerts.slice(0, 5).map((a) => {
              const pm = priorityMeta(a.priority)
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ backgroundColor: pm.bg, color: pm.fg }}
                      >
                        {pm.label}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {a.labCode} &mdash; {a.labName}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.code} &mdash; {a.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(a.createdAt)}</span>
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => navigate("/admin/incidents")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#003B7A] hover:underline"
            >
              Ver todas las incidencias
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </CardBody>
        </Card>
      )}

      {/* Laboratories (redesigned cards) */}
      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Estado de laboratorios</h2>
          {!loading && alerts.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-[#16A34A]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Sin alertas críticas activas.
            </span>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : cardLabs.length === 0 ? (
          <Card>
            <CardBody className="py-10 text-center text-sm text-muted-foreground">
              {hasActiveFilter
                ? "No hay laboratorios para la facultad seleccionada."
                : "No hay laboratorios registrados."}
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cardLabs.map((lab) => (
              <LabStatusCard
                key={lab.id}
                lab={lab}
                compact
                fetchInventory={fetchLabInventory}
                fetchIncidents={fetchLabIncidents}
              />
            ))}
          </div>
        )}
      </section>

      {/* Today's sessions */}
      <Card className="mt-6">
        <CardHeader title="Sesiones de hoy" subtitle={`${filteredSessions.length} sesión(es) programadas`} />
        <CardBody className="p-0">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">Cargando…</div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-muted-foreground">
              <CalendarClock className="h-8 w-8" />
              <p className="text-sm">No hay sesiones programadas para hoy.</p>
              {hasActiveFilter && (
                <p className="text-xs">No hay sesiones para la facultad/carrera seleccionada.</p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredSessions.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex w-16 shrink-0 flex-col">
                    <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatTime(s.startTime)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTime(s.endTime)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {s.subjectName || "Materia"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.laboratoryName || s.laboratoryCode || "Laboratorio"}
                      {" · "}
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {s.teacherName || "Docente"}
                      </span>
                    </p>
                  </div>
                  <StatusBadge value={s.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
