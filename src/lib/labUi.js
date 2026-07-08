import { Monitor, Network, Settings, BookOpen, Building2 } from "lucide-react"

/**
 * Shared visual metadata for the SIGLA UCE classroom / laboratory UI.
 * Colors extend the institutional palette (#003B7A, #C8102E) with the
 * per-type accents defined in the redesign spec.
 */

// ── Room type → icon, circle colors and Spanish chip label ──────────────────
export const TYPE_META = {
  COMPUTING: { Icon: Monitor, bg: "#DBEAFE", fg: "#1D4ED8", label: "Cómputo" },
  NETWORKS: { Icon: Network, bg: "#EDE9FE", fg: "#7C3AED", label: "Redes" },
  INDUSTRIAL: { Icon: Settings, bg: "#FEF3C7", fg: "#D97706", label: "Infraestructura TI" },
  THEORETICAL: { Icon: BookOpen, bg: "#F0FDF4", fg: "#16A34A", label: "Aula magna" },
  OTHER: { Icon: Building2, bg: "#F3F4F6", fg: "#6B7280", label: "Otro" },
}

export function typeMeta(type) {
  return TYPE_META[type] || TYPE_META.OTHER
}

// Labs that keep workstation equipment.
export function hasEquipment(type) {
  return type === "COMPUTING" || type === "NETWORKS"
}

// ── Header color by room status ──────────────────────────────────────────────
export function headerStyle(lab) {
  if (lab.status === "UNDER_MAINTENANCE") return { bg: "#D97706", badge: "MANTENIMIENTO" }
  if (lab.status === "CLOSED") return { bg: "#6B7280", badge: "CERRADA" }
  if (lab.currentSession) return { bg: "#003B7A", badge: "EN CLASE" }
  return { bg: "#16A34A", badge: "DISPONIBLE" }
}

// ── Teacher avatar helpers (from spec) ───────────────────────────────────────
export function getInitials(fullName) {
  if (!fullName) return "?"
  const parts = String(fullName).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getAvatarColor(name) {
  const colors = ["#003B7A", "#7C3AED", "#D97706", "#16A34A", "#DC2626", "#0891B2", "#BE185D", "#065F46"]
  let hash = 0
  const s = String(name || "")
  for (let i = 0; i < s.length; i++) hash += s.charCodeAt(i)
  return colors[hash % colors.length]
}

// ── Workstation status → grid cell colors + Spanish label ────────────────────
export const WS_STATUS_META = {
  AVAILABLE: { label: "Disponible", bg: "#DCFCE7", border: "#86EFAC", dot: "#16A34A" },
  OCCUPIED: { label: "Ocupada", bg: "#DBEAFE", border: "#93C5FD", dot: "#1D4ED8" },
  UNDER_MAINTENANCE: { label: "Mantenimiento", bg: "#FEF3C7", border: "#FCD34D", dot: "#D97706" },
  OUT_OF_SERVICE: { label: "Fuera de servicio", bg: "#FEE2E2", border: "#FCA5A5", dot: "#DC2626" },
}

export function wsStatusMeta(status) {
  return WS_STATUS_META[status] || WS_STATUS_META.AVAILABLE
}

// ── Equipment status → Spanish label ─────────────────────────────────────────
export const EQUIPMENT_STATUS_LABEL = {
  OPERATIONAL: "Operativo",
  UNDER_MAINTENANCE: "En mantenimiento",
  OUT_OF_SERVICE: "Fuera de servicio",
}

// ── Incident priority → colors + Spanish label ───────────────────────────────
export const PRIORITY_META = {
  CRITICAL: { label: "Crítica", bg: "#FEE2E2", fg: "#B91C1C" },
  HIGH: { label: "Alta", bg: "#FFEDD5", fg: "#C2410C" },
  MEDIUM: { label: "Media", bg: "#FEF3C7", fg: "#B45309" },
  LOW: { label: "Baja", bg: "#F3F4F6", fg: "#4B5563" },
}

export function priorityMeta(priority) {
  return PRIORITY_META[priority] || PRIORITY_META.MEDIUM
}

// ── Incident status → Spanish label ──────────────────────────────────────────
export const INCIDENT_STATUS_LABEL = {
  OPEN: "Abierta",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelta",
  CLOSED: "Cerrada",
}

// ── Incident category / type → Spanish label ─────────────────────────────────
export const CATEGORY_LABEL = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  NETWORKING: "Redes",
  INFRASTRUCTURE: "Infraestructura",
  OTHER: "Otro",
}

export const INCIDENT_TYPE_LABEL = {
  INCIDENT: "Incidencia",
  REQUEST: "Solicitud",
}

export function isActiveIncident(i) {
  return i && (i.status === "OPEN" || i.status === "IN_PROGRESS")
}

// ── Date helpers for incidents ───────────────────────────────────────────────
export function shortDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function relativeTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diffMs = Date.now() - d.getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return "hace un momento"
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return "hace 1 día"
  return `hace ${days} días`
}
