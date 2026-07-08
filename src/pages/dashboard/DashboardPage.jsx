import { useCallback, useEffect, useMemo, useState } from "react"
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
import { ProgressBar } from "../../components/ProgressBar"
import { Select } from "../../components/Field"
import { formatTime } from "../../lib/utils"

const todayISO = () => new Date().toISOString().slice(0, 10)

export function DashboardPage() {
  const { selectedId: academicPeriodId, selected } = usePeriod()

  const [facultyId, setFacultyId] = useState("")
  const [programId, setProgramId] = useState("")
  const [careersByFaculty, setCareersByFaculty] = useState([])

  const loadAll = useCallback(async () => {
    const [faculties, labs, subjects, sessions] = await Promise.all([
      api.get("/faculties").catch(() => []),
      api.get("/laboratories").catch(() => []),
      api.get("/subjects").catch(() => []),
      academicPeriodId
        ? api.get(`/sessions?academicPeriodId=${academicPeriodId}&date=${todayISO()}`).catch(() => [])
        : Promise.resolve([]),
    ])
    return {
      allFaculties: asList(faculties),
      allLabs: asList(labs),
      allSubjects: asList(subjects),
      todaySessions: asList(sessions),
    }
  }, [academicPeriodId])

  const { data, loading, refetch } = useAsync(loadAll, [academicPeriodId])
  const allFaculties = data?.allFaculties || []
  const allLabs = data?.allLabs || []
  const allSubjects = data?.allSubjects || []
  const todaySessions = data?.todaySessions || []

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

  // Labs filtered by faculty (academic program does not affect KPIs / occupancy).
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

  // Occupancy per (filtered) laboratory, derived from today's in-progress sessions.
  const occupancy = useMemo(() => {
    return filteredLabs.map((lab) => {
      const current = filteredSessions.find(
        (s) => String(s.laboratoryId) === String(lab.id) && s.status === "IN_PROGRESS",
      )
      const students = current?.registeredStudentCount ?? 0
      const max = lab.capacity ?? 0
      const pct = max > 0 && current ? Math.min(100, (students / max) * 100) : 0
      return { id: lab.id, code: lab.code, name: lab.name, students, max, pct, busy: Boolean(current) }
    })
  }, [filteredLabs, filteredSessions])

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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's sessions */}
        <Card>
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

        {/* Occupancy */}
        <Card>
          <CardHeader title="Ocupación por laboratorio" subtitle="Uso actual de cada laboratorio" />
          <CardBody className="space-y-4">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Cargando…</div>
            ) : occupancy.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {hasActiveFilter
                  ? "No hay laboratorios para la facultad seleccionada."
                  : "No hay datos de ocupación."}
              </div>
            ) : (
              occupancy.map((lab) => (
                <div key={lab.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{lab.name}</p>
                      <p className="text-xs text-muted-foreground">{lab.code}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {lab.busy ? `${lab.students}/${lab.max} estudiantes` : "Libre"}
                    </span>
                  </div>
                  <ProgressBar value={lab.pct} />
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
