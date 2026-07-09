import { useState } from "react"
import {
  Wrench,
  Lock,
  CheckCircle,
  Clock,
  ChevronDown,
  Monitor,
  AlertTriangle,
  Loader2,
  Router,
} from "lucide-react"
import {
  typeMeta,
  hasEquipment,
  headerStyle,
  getInitials,
  getAvatarColor,
  priorityMeta,
  severityMeta,
  INCIDENT_STATUS_LABEL,
  EQUIPMENT_STATUS_LABEL,
  shortDate,
} from "../../lib/labUi"
import { WorkstationGrid, WorkstationLegend } from "../../components/WorkstationGrid"
import { Modal } from "../../components/Modal"
import { Button } from "../../components/Button"
import { Badge, StatusBadge } from "../../components/Badge"

function occupancyColor(pct) {
  if (pct > 85) return "#DC2626"
  if (pct >= 60) return "#D97706"
  return "#16A34A"
}

/**
 * Classroom-style status card.
 *
 * props:
 *  - lab: lab object (may include currentSession, nextSession, inventorySummary, incidentSummary)
 *  - compact: smaller header, no "next class" section (admin dashboard)
 *  - fetchInventory(labId): async → { workstations: [...with equipment], devices: [...] }
 *  - fetchIncidents(labId): async → incident[]
 *  - categoryName: resolved laboratory category name (backend sends categoryId only)
 */
export function LabStatusCard({ lab, compact = false, fetchInventory, fetchIncidents, categoryName }) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState("equipment")
  const [inv, setInv] = useState(null)
  const [incidents, setIncidents] = useState(null)
  const [loadingInv, setLoadingInv] = useState(false)
  const [loadingInc, setLoadingInc] = useState(false)
  const [showAllIncidents, setShowAllIncidents] = useState(false)

  const t = typeMeta(categoryName)
  const TypeIcon = t.Icon
  const { bg, badge } = headerStyle(lab)
  const session = lab.currentSession
  const next = lab.nextSession
  const canEquip = hasEquipment(categoryName)
  const iconSize = compact ? 32 : 40

  const invSummary = lab.inventorySummary
  const incSummary = lab.incidentSummary
  const activeIncidents = incSummary ? incSummary.openIncidents + incSummary.inProgressIncidents : 0
  const hasCritical = incSummary ? incSummary.criticalIncidents > 0 : false

  const pct =
    session && lab.capacity
      ? Math.min(100, Math.round((session.totalStudents / lab.capacity) * 100))
      : 0

  const showFooter = Boolean(invSummary) || activeIncidents > 0

  async function loadDetails(which) {
    if (which === "equipment" && canEquip && inv == null && fetchInventory) {
      setLoadingInv(true)
      try {
        setInv(await fetchInventory(lab.id))
      } catch {
        setInv({ workstations: [], devices: [] })
      } finally {
        setLoadingInv(false)
      }
    }
    if (which === "incidents" && incidents == null && fetchIncidents) {
      setLoadingInc(true)
      try {
        setIncidents(await fetchIncidents(lab.id))
      } catch {
        setIncidents([])
      } finally {
        setLoadingInc(false)
      }
    }
  }

  function toggle() {
    const willOpen = !expanded
    setExpanded(willOpen)
    if (willOpen) {
      const startTab = canEquip ? "equipment" : "incidents"
      setTab(startTab)
      loadDetails(startTab)
    }
  }

  function switchTab(which) {
    setTab(which)
    loadDetails(which)
  }

  const visibleIncidents = incidents
    ? showAllIncidents
      ? incidents
      : incidents.slice(0, 3)
    : []

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      {/* ── Layer 1: Room identity header ─────────────────────────────── */}
      <header className={`px-4 text-white ${compact ? "py-2.5" : "py-3"}`} style={{ backgroundColor: bg }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{ width: iconSize, height: iconSize, backgroundColor: t.bg, color: t.fg }}
              aria-hidden="true"
            >
              <TypeIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </span>
            <div className="min-w-0">
              <p className={`font-bold opacity-80 ${compact ? "text-xs" : "text-sm"}`}>{lab.code}</p>
              <h3 className={`truncate font-bold ${compact ? "text-sm" : "text-base"}`}>{lab.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: t.bg, color: t.fg }}
                >
                  {t.label}
                </span>
                <span className="text-xs text-white/80">Capacidad: {lab.capacity} puestos</span>
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
            {badge}
          </span>
        </div>
      </header>

      {/* ── Layer 2: Current session ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {lab.status === "UNDER_MAINTENANCE" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
            <Wrench className={compact ? "h-8 w-8 text-[#D97706]" : "h-10 w-10 text-[#D97706]"} aria-hidden="true" />
            <p className="text-base font-semibold text-[#D97706]">En mantenimiento</p>
            <p className="text-sm text-[#6B7280]">Esta aula está temporalmente fuera de servicio.</p>
            {hasCritical && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-semibold text-[#B91C1C]">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Incidencia crítica activa
              </span>
            )}
          </div>
        ) : lab.status === "CLOSED" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
            <Lock className={compact ? "h-8 w-8 text-[#6B7280]" : "h-10 w-10 text-[#6B7280]"} aria-hidden="true" />
            <p className="text-base font-semibold text-[#6B7280]">Aula cerrada</p>
            <p className="text-sm text-[#6B7280]">No disponible durante el periodo académico actual.</p>
          </div>
        ) : session ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#003B7A]">En clase ahora</p>
            <div className="flex items-start gap-3">
              {session.teacherImageUrl ? (
                <img
                  src={session.teacherImageUrl || "/placeholder.svg"}
                  alt={session.teacher}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(session.teacher) }}
                  aria-hidden="true"
                >
                  {getInitials(session.teacher)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1F2937]">{session.teacher}</p>
                <p className="truncate text-sm text-[#374151]">{session.subject}</p>
                <p className="flex items-center gap-1 text-[13px] text-[#6B7280]">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {session.startTime} &ndash; {session.endTime}
                </p>
              </div>
            </div>

            {/* Attendance */}
            <div className="mt-1">
              <p className="mb-1 text-xs font-medium text-[#6B7280]">Asistencia</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: occupancyColor(pct) }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <span className="shrink-0 text-[13px] font-medium text-[#374151]">
                  {session.totalStudents} / {lab.capacity}
                </span>
                <span className="shrink-0 text-[13px] font-semibold" style={{ color: occupancyColor(pct) }}>
                  {pct}%
                </span>
              </div>
            </div>

            {!compact && next && (
              <div className="mt-2 border-t border-[#E5E7EB] pt-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                  Próxima clase
                </p>
                <p className="text-[13px] text-[#1F2937]">
                  {next.subject} · {next.teacher} · {next.startTime}&ndash;{next.endTime}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#16A34A]">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Aula disponible
            </p>
            <p className="text-sm text-[#6B7280]">No hay clases programadas en este momento.</p>
            {!compact &&
              (next ? (
                <div className="mt-1 border-t border-[#E5E7EB] pt-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                    Próxima clase
                  </p>
                  <p className="text-sm font-medium text-[#1F2937]">{next.subject}</p>
                  <p className="text-[13px] text-[#374151]">
                    {next.teacher} · {next.startTime}&ndash;{next.endTime}
                  </p>
                </div>
              ) : (
                <p className="text-[13px] text-[#6B7280]">No hay más clases programadas hoy.</p>
              ))}
          </div>
        )}

        {/* ── Layer 3: Inventory + incidents footer ───────────────────── */}
        {showFooter && (
          <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-[#E5E7EB] pt-3">
            {invSummary && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#334155]">
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                {invSummary.availableWorkstations}/{invSummary.totalWorkstations} estaciones
              </span>
            )}
            {activeIncidents > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={
                  hasCritical
                    ? { backgroundColor: "#FEE2E2", color: "#B91C1C" }
                    : { backgroundColor: "#FEF3C7", color: "#B45309" }
                }
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {activeIncidents} {activeIncidents === 1 ? "incidencia activa" : "incidencias activas"}
              </span>
            )}
            <button
              type="button"
              onClick={toggle}
              aria-expanded={expanded}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#003B7A] transition-colors hover:bg-[#003B7A]/5"
            >
              Ver detalles
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        )}
      </div>

      {/* ── Expandable panel ──────────────────────────────────────────── */}
      {showFooter && (
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-[#E5E7EB] bg-[#F8FAFC] p-4">
              {/* Tabs */}
              <div className="mb-3 flex gap-1 rounded-lg bg-[#E2E8F0] p-1">
                {canEquip && (
                  <button
                    type="button"
                    onClick={() => switchTab("equipment")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      tab === "equipment" ? "bg-white text-[#003B7A] shadow-sm" : "text-[#64748B]"
                    }`}
                  >
                    Estaciones y equipos
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => switchTab("incidents")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === "incidents" ? "bg-white text-[#003B7A] shadow-sm" : "text-[#64748B]"
                  }`}
                >
                  Incidencias
                </button>
              </div>

              {/* Equipment tab */}
              {tab === "equipment" && canEquip && (
                <div className="space-y-3">
                  {loadingInv || !inv ? (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-7 w-7 animate-pulse rounded-md bg-[#E2E8F0]" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <WorkstationGrid workstations={inv.workstations} />
                      <WorkstationLegend />
                      {inv.devices && inv.devices.length > 0 && (
                        <div className="border-t border-[#E5E7EB] pt-2">
                          <p className="mb-1.5 text-xs font-semibold text-[#334155]">Equipos de red</p>
                          <ul className="space-y-1.5">
                            {inv.devices.map((d) => (
                              <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs text-[#475569]">
                                <Router className="h-3.5 w-3.5 shrink-0 text-[#7C3AED]" aria-hidden="true" />
                                <span className="font-mono text-[#334155]">{d.code}</span>
                                <span className="font-medium">{d.name}</span>
                                {d.categoryName && <span className="text-[#94A3B8]">· {d.categoryName}</span>}
                                <span className="text-[#94A3B8]">
                                  · {EQUIPMENT_STATUS_LABEL[d.status] || d.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {tab === "equipment" && !canEquip && (
                <p className="py-4 text-center text-sm text-[#6B7280]">
                  Esta aula no tiene equipos registrados.
                </p>
              )}

              {/* Incidents tab */}
              {tab === "incidents" && (
                <div className="space-y-2">
                  {loadingInc || incidents == null ? (
                    <div className="space-y-2">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-lg bg-[#E2E8F0]" />
                      ))}
                    </div>
                  ) : incidents.length === 0 ? (
                    <p className="flex items-center gap-1.5 py-3 text-sm text-[#16A34A]">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      Sin incidencias activas registradas.
                    </p>
                  ) : (
                    <>
                      {visibleIncidents.map((inc) => {
                        const pm = priorityMeta(inc.priority)
                        return (
                          <div key={inc.id} className="rounded-lg border border-[#E5E7EB] bg-white p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                                style={{ backgroundColor: pm.bg, color: pm.fg }}
                              >
                                {pm.label}
                              </span>
                              <span className="text-xs font-medium text-[#334155]">{inc.code}</span>
                              <span className="text-xs text-[#94A3B8]">
                                · {shortDate(inc.createdAt)} · {severityMeta(inc.severity).label}
                              </span>
                            </div>
                            <p className="text-sm text-[#475569]">{inc.description}</p>
                            <p className="mt-1 text-xs text-[#94A3B8]">
                              Estado: {INCIDENT_STATUS_LABEL[inc.status] || inc.status}
                            </p>
                          </div>
                        )
                      })}
                      {incidents.length > 3 && !showAllIncidents && (
                        <button
                          type="button"
                          onClick={() => setShowAllIncidents(true)}
                          className="w-full rounded-lg py-1.5 text-xs font-semibold text-[#003B7A] hover:bg-[#003B7A]/5"
                        >
                          Ver todas las incidencias
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
