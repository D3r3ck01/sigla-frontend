import { cn } from "../lib/utils"

const tones = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
}

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone] || tones.neutral,
        className,
      )}
    >
      {children}
    </span>
  )
}

/* Maps domain status strings (real backend enums) to label + tone. */
export const STATUS_META = {
  // Academic period / general status
  ACTIVE: { label: "Activo", tone: "success" },
  CLOSED: { label: "Cerrado", tone: "danger" },
  INACTIVE: { label: "Inactivo", tone: "neutral" },
  // Laboratory status
  UNDER_MAINTENANCE: { label: "En mantenimiento", tone: "warning" },
  // Session status
  SCHEDULED: { label: "Programada", tone: "info" },
  IN_PROGRESS: { label: "En curso", tone: "warning" },
  FINISHED: { label: "Finalizada", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
  // Teacher attendance
  ARRIVED: { label: "Llegó", tone: "success" },
  LATE: { label: "Retraso", tone: "warning" },
  ABSENT: { label: "No llegó", tone: "danger" },
  NOT_RECORDED: { label: "No registrada", tone: "neutral" },
  // Laboratory type
  COMPUTING: { label: "Cómputo", tone: "info" },
  NETWORKS: { label: "Redes", tone: "primary" },
  INDUSTRIAL: { label: "Industrial", tone: "warning" },
  THEORETICAL: { label: "Teórico", tone: "neutral" },
  OTHER: { label: "Otro", tone: "neutral" },
}

export function StatusBadge({ value, className }) {
  const meta = STATUS_META[value] || { label: value || "—", tone: "neutral" }
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  )
}
