import { Monitor, Network, Settings, BookOpen, Building2 } from "lucide-react"

/**
 * Shared visual metadata for the Labora classroom / laboratory UI.
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

/**
 * Resolves visual metadata from a laboratory *category name* (the backend no
 * longer sends a `type` enum — categories are loaded dynamically). Matches the
 * known category names, falling back to keyword detection then OTHER.
 */
export function typeMeta(categoryName) {
  if (!categoryName) return TYPE_META.OTHER
  const key = String(categoryName).toUpperCase()
  if (TYPE_META[key]) return TYPE_META[key]
  if (key.includes("COMPUT") || key.includes("CÓMPUT")) return TYPE_META.COMPUTING
  if (key.includes("NETWORK") || key.includes("RED")) return TYPE_META.NETWORKS
  if (key.includes("INDUSTR") || key.includes("INFRA")) return TYPE_META.INDUSTRIAL
  if (key.includes("THEOR") || key.includes("TEOR") || key.includes("AULA")) return TYPE_META.THEORETICAL
  return TYPE_META.OTHER
}

// Labs that keep workstation equipment (accepts a category name).
export function hasEquipment(categoryName) {
  const meta = typeMeta(categoryName)
  return meta === TYPE_META.COMPUTING || meta === TYPE_META.NETWORKS
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
// Backend enum: ACTIVE | INACTIVE | UNDER_MAINTENANCE
export const WS_STATUS_META = {
  ACTIVE: { label: "Activa", bg: "#DCFCE7", border: "#86EFAC", dot: "#16A34A" },
  UNDER_MAINTENANCE: { label: "Mantenimiento", bg: "#FEF3C7", border: "#FCD34D", dot: "#D97706" },
  INACTIVE: { label: "Inactiva", bg: "#FEE2E2", border: "#FCA5A5", dot: "#DC2626" },
}

export function wsStatusMeta(status) {
  return WS_STATUS_META[status] || WS_STATUS_META.ACTIVE
}

// ── Equipment status → Spanish label ─────────────────────────────────────────
// Backend enum: ACTIVE | INACTIVE | DAMAGED | UNDER_MAINTENANCE
export const EQUIPMENT_STATUS_LABEL = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  DAMAGED: "Dañado",
  UNDER_MAINTENANCE: "En mantenimiento",
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

// ── Incident severity → colors + Spanish label ───────────────────────────────
// Backend enum: MINOR | MAJOR | CRITICAL
export const SEVERITY_META = {
  CRITICAL: { label: "Crítica", bg: "#FEE2E2", fg: "#B91C1C" },
  MAJOR: { label: "Mayor", bg: "#FFEDD5", fg: "#C2410C" },
  MINOR: { label: "Menor", bg: "#F3F4F6", fg: "#4B5563" },
}

export const SEVERITY_LABEL = {
  MINOR: "Menor",
  MAJOR: "Mayor",
  CRITICAL: "Crítica",
}

export function severityMeta(severity) {
  return SEVERITY_META[severity] || SEVERITY_META.MINOR
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
