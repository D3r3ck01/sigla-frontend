import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  FlaskConical,
  LogIn,
  RefreshCw,
  Building2,
  CheckCircle,
  Users,
  Wrench,
  AlertCircle,
  ArrowRight,
  Filter,
  X,
} from "lucide-react"
import { publicFetch } from "../../lib/publicApi"
import { useAuth } from "../../context/AuthContext"
import { LabStatusCard } from "./LabStatusCard"
import { TodayScheduleTable } from "./TodayScheduleTable"

const REFRESH_MS = 60000

function formatFullDate(date) {
  const s = date.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatClock(date) {
  return date.toLocaleTimeString("es-EC", { hour12: false })
}

function hm(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

/* Shared styling for the header filter selects. */
const filterSelectStyle = {
  backgroundColor: "rgba(255,255,255,.15)",
  color: "#fff",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: "13px",
  maxWidth: "220px",
}

/* ── KPI card ─────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, value, label, topColor }) {
  return (
    <div
      className="rounded-xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{ borderTop: `3px solid ${topColor}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[32px] font-bold leading-none" style={{ color: topColor }}>
          {value}
        </span>
        <Icon className="h-6 w-6" style={{ color: topColor }} aria-hidden="true" />
      </div>
      <p className="mt-2 text-sm text-[#6B7280]">{label}</p>
    </div>
  )
}

/* ── Skeleton lab card ────────────────────────────────────────────────── */
function LabCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="h-16 animate-pulse bg-[#E5E7EB]" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#E5E7EB]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#E5E7EB]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#E5E7EB]" />
        <div className="h-2 w-full animate-pulse rounded bg-[#E5E7EB]" />
      </div>
    </div>
  )
}

export function PublicStatusPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [allLabs, setAllLabs] = useState([])
  const [sessions, setSessions] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [faculties, setFaculties] = useState([])
  const [programs, setPrograms] = useState([])

  const [facultyId, setFacultyId] = useState("")
  const [programId, setProgramId] = useState("")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [lastUpdated, setLastUpdated] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [spinning, setSpinning] = useState(false)

  const lastUpdatedRef = useRef(null)

  async function loadData() {
    setSpinning(true)
    try {
      const [labsData, sessionsData] = await Promise.all([
        publicFetch("/public/laboratories/status"),
        publicFetch("/public/sessions/today"),
      ])
      setAllLabs(Array.isArray(labsData) ? labsData : [])
      setSessions(Array.isArray(sessionsData) ? sessionsData : [])
      setError(false)
      const stamp = new Date()
      lastUpdatedRef.current = stamp
      setLastUpdated(stamp)
      setSecondsAgo(0)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      // keep the spin visible for ~1s on every refresh
      setTimeout(() => setSpinning(false), 1000)
    }
  }

  // Load filter catalogs once (public, no auth in demo mode).
  useEffect(() => {
    publicFetch("/faculties")
      .then((d) => setFaculties(Array.isArray(d) ? d : []))
      .catch(() => setFaculties([]))
    publicFetch("/subjects")
      .then((d) => setAllSubjects(Array.isArray(d) ? d : []))
      .catch(() => setAllSubjects([]))
  }, [])

  // Cascading academic programs when a faculty is selected.
  useEffect(() => {
    if (!facultyId) {
      setPrograms([])
      setProgramId("")
      return
    }
    publicFetch(`/faculties/${facultyId}/academic-programs`)
      .then((d) => setPrograms(Array.isArray(d) ? d : []))
      .catch(() => setPrograms([]))
  }, [facultyId])

  // Initial load + 60s auto-refresh.
  useEffect(() => {
    loadData()
    const dataInterval = setInterval(loadData, REFRESH_MS)

    // 1s tick: live clock + "hace X seg" indicator.
    const tickInterval = setInterval(() => {
      const current = new Date()
      setNow(current)
      if (lastUpdatedRef.current) {
        setSecondsAgo(Math.floor((current.getTime() - lastUpdatedRef.current.getTime()) / 1000))
      }
    }, 1000)

    return () => {
      clearInterval(dataInterval)
      clearInterval(tickInterval)
    }
  }, [])

  // Map lab id → faculty id (from the full, unfiltered lab list).
  const labFacultyMap = useMemo(() => {
    const map = new Map()
    for (const lab of allLabs) map.set(lab.id, lab.facultyId)
    return map
  }, [allLabs])

  // Map subject id → academic program id.
  const subjectProgramMap = useMemo(() => {
    const map = new Map()
    for (const s of allSubjects) map.set(s.id, s.academicProgramId)
    return map
  }, [allSubjects])

  // Labs filtered by faculty (academic program does not affect lab cards / KPIs).
  const filteredLabs = useMemo(() => {
    if (!facultyId) return allLabs
    return allLabs.filter((l) => String(l.facultyId) === String(facultyId))
  }, [allLabs, facultyId])

  // Sessions filtered by faculty (via lab) and academic program (via subject).
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (facultyId && String(labFacultyMap.get(s.laboratoryId)) !== String(facultyId)) return false
      if (programId && String(subjectProgramMap.get(s.subjectId)) !== String(programId)) return false
      return true
    })
  }, [sessions, facultyId, programId, labFacultyMap, subjectProgramMap])

  const kpis = useMemo(() => {
    const total = filteredLabs.length
    const available = filteredLabs.filter((l) => l.status === "ACTIVE" && !l.currentSession).length
    const occupied = filteredLabs.filter((l) => Boolean(l.currentSession)).length
    const maintenance = filteredLabs.filter((l) => l.status === "UNDER_MAINTENANCE").length
    return { total, available, occupied, maintenance }
  }, [filteredLabs])

  const countdown = Math.max(0, Math.ceil((REFRESH_MS - secondsAgo * 1000) / 1000))

  const selectedFaculty = faculties.find((f) => String(f.id) === String(facultyId))
  const selectedProgram = programs.find((p) => String(p.id) === String(programId))
  const hasActiveFilter = Boolean(facultyId)

  function clearFilters() {
    setFacultyId("")
    setProgramId("")
    setMobileFiltersOpen(false)
  }

  /* Faculty + program selects, reused on desktop header and mobile drawer.
     Rendered via a plain helper function (not a nested React component) so the
     selects are not remounted on every parent render. */
  function renderFilterControls(variant = "header") {
    const isHeader = variant === "header"
    const selectClass = isHeader
      ? "h-9 rounded-lg border-0 px-3 outline-none focus:ring-2 focus:ring-white/40"
      : "h-11 w-full rounded-lg border border-[#DBEAFE] bg-white px-3 text-sm text-[#003B7A] outline-none focus:ring-2 focus:ring-[#003B7A]/30"
    return (
      <>
        <select
          aria-label="Filtrar por facultad"
          value={facultyId}
          onChange={(e) => {
            setFacultyId(e.target.value)
            setProgramId("")
          }}
          className={selectClass}
          style={isHeader ? filterSelectStyle : undefined}
        >
          <option value="" style={{ color: "#000" }}>
            Todas las facultades
          </option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id} style={{ color: "#000" }}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por carrera"
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          disabled={!facultyId}
          className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-50`}
          style={isHeader ? filterSelectStyle : undefined}
        >
          <option value="" style={{ color: "#000" }}>
            Todas las carreras
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id} style={{ color: "#000" }}>
              {p.name}
            </option>
          ))}
        </select>
      </>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#003B7A] text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
          {/* Left */}
          <div className="flex items-center gap-2">
            <FlaskConical className="h-6 w-6 shrink-0" aria-hidden="true" />
            <div className="leading-tight">
              <p className="text-lg font-bold">SIGLA UCE</p>
              <p className="hidden text-xs text-white/70 md:block">
                Universidad Central del Ecuador
              </p>
            </div>
          </div>

          {/* Center: filters (desktop only) */}
          <div className="hidden flex-1 items-center justify-center gap-2 lg:flex">
            {renderFilterControls("header")}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Mobile filter trigger */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="relative inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white lg:hidden"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilter && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#C8102E]" />
              )}
            </button>

            <div className="text-right leading-tight">
              <p className="font-mono text-base font-bold tabular-nums">{formatClock(now)}</p>
              <p className="flex items-center justify-end gap-1 text-xs text-white/70">
                <RefreshCw
                  className={`h-3 w-3 ${spinning ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                hace {secondsAgo} seg.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#a30d25]"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ingresar al sistema</span>
            </button>
          </div>
        </div>
      </header>

      {/* Active filter banner */}
      {hasActiveFilter && (
        <div className="border-b border-[#DBEAFE] bg-[#EFF6FF]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2.5 text-sm text-[#003B7A] md:px-6">
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
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 flex h-full w-4/5 max-w-xs flex-col gap-4 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#003B7A]">Filtros</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F1F5F9]"
                aria-label="Cerrar filtros"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#6B7280]">Facultad</label>
              {renderFilterControls("drawer")}
            </div>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg border border-[#003B7A]/20 px-3 py-2 text-sm font-medium text-[#003B7A] hover:bg-[#003B7A]/5"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
        {/* Date */}
        <p className="mb-4 text-sm text-[#6B7280] md:hidden">{formatFullDate(now)}</p>

        {/* Active session banner */}
        {user && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#003B7A]/20 bg-[#003B7A]/5 px-4 py-3">
            <p className="text-sm text-[#1F2937]">
              Tienes una sesión activa como{" "}
              <span className="font-semibold">{user.role || user.rol || "Administrador"}</span>
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-1 rounded-lg bg-[#003B7A] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#002b5c]"
            >
              Ir al Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#FEE2E2] px-4 py-3 text-[#C8102E]">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              No se pudo conectar con el servidor. Reintentando en {countdown} segundos...
            </p>
          </div>
        )}

        {/* KPIs */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Building2} value={kpis.total} label="Total laboratorios" topColor="#003B7A" />
          <KpiCard
            icon={CheckCircle}
            value={kpis.available}
            label="Disponibles ahora"
            topColor="#16A34A"
          />
          <KpiCard icon={Users} value={kpis.occupied} label="Ocupados ahora" topColor="#D97706" />
          <KpiCard
            icon={Wrench}
            value={kpis.maintenance}
            label="En mantenimiento"
            topColor="#C8102E"
          />
        </section>

        {/* Lab status */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[#1F2937]">Estado actual de laboratorios</h2>
            <p className="text-sm text-[#6B7280]">
              {lastUpdated
                ? `Última actualización: ${formatClock(lastUpdated)}`
                : "Cargando información..."}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <LabCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredLabs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white py-16 text-center shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <FlaskConical className="h-12 w-12 text-[#6B7280]" aria-hidden="true" />
              <p className="text-[#6B7280]">
                {hasActiveFilter
                  ? "No hay laboratorios registrados para esta facultad."
                  : "No hay laboratorios registrados en el sistema."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLabs.map((lab) => (
                <LabStatusCard key={lab.id} lab={lab} />
              ))}
            </div>
          )}
        </section>

        {/* Today's schedule */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-[#1F2937]">
            Horario de hoy &mdash; {formatFullDate(now)}
          </h2>
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]" />
          ) : (
            <TodayScheduleTable sessions={filteredSessions} nowHM={hm(now)} />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#003B7A] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-sm md:flex-row md:items-center md:justify-between md:px-6">
          <p>© 2026 Universidad Central del Ecuador &mdash; Facultad de Ciencias Aplicadas</p>
          <p className="text-xs text-white/70">
            Los datos se actualizan automáticamente cada 60 segundos.
          </p>
        </div>
      </footer>
    </div>
  )
}
