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

  const [labs, setLabs] = useState([])
  const [sessions, setSessions] = useState([])
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
      setLabs(Array.isArray(labsData) ? labsData : [])
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

  const kpis = useMemo(() => {
    const total = labs.length
    const disponibles = labs.filter((l) => l.estado === "ACTIVO" && !l.sesionActual).length
    const ocupados = labs.filter((l) => Boolean(l.sesionActual)).length
    const mantenimiento = labs.filter((l) => l.estado === "EN_MANTENIMIENTO").length
    return { total, disponibles, ocupados, mantenimiento }
  }, [labs])

  const countdown = Math.max(0, Math.ceil((REFRESH_MS - secondsAgo * 1000) / 1000))

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

          {/* Center (desktop) */}
          <p className="hidden text-sm text-white md:block">{formatFullDate(now)}</p>

          {/* Right */}
          <div className="flex items-center gap-3">
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
        {/* Active session banner */}
        {user && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#003B7A]/20 bg-[#003B7A]/5 px-4 py-3">
            <p className="text-sm text-[#1F2937]">
              Tienes una sesión activa como{" "}
              <span className="font-semibold">{user.rol || "Administrador"}</span>
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
            value={kpis.disponibles}
            label="Disponibles ahora"
            topColor="#16A34A"
          />
          <KpiCard icon={Users} value={kpis.ocupados} label="Ocupados ahora" topColor="#D97706" />
          <KpiCard
            icon={Wrench}
            value={kpis.mantenimiento}
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
          ) : labs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white py-16 text-center shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <FlaskConical className="h-12 w-12 text-[#6B7280]" aria-hidden="true" />
              <p className="text-[#6B7280]">No hay laboratorios registrados en el sistema.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {labs.map((lab) => (
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
            <TodayScheduleTable sessions={sessions} nowHM={hm(now)} />
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
