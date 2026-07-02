import { User, Clock, CalendarCheck, Wrench, Lock } from "lucide-react"

/**
 * Visual config per lab status. Colors are the UCE institutional palette.
 * - En curso  → azul UCE
 * - Libre     → verde
 * - Mantenim. → ámbar
 * - Cerrado   → gris
 */
function getHeaderStyle(lab) {
  if (lab.estado === "EN_MANTENIMIENTO") {
    return { bg: "bg-[#D97706]", badge: "MANTENIMIENTO" }
  }
  if (lab.estado === "CERRADO") {
    return { bg: "bg-[#6B7280]", badge: "CERRADO" }
  }
  if (lab.sesionActual) {
    return { bg: "bg-[#003B7A]", badge: "EN CURSO" }
  }
  return { bg: "bg-[#16A34A]", badge: "LIBRE" }
}

function occupancyColor(pct) {
  if (pct > 85) return "bg-[#DC2626]"
  if (pct >= 60) return "bg-[#D97706]"
  return "bg-[#16A34A]"
}

export function LabStatusCard({ lab }) {
  const { bg, badge } = getHeaderStyle(lab)
  const session = lab.sesionActual
  const next = lab.proximaSesion

  const pct =
    session && lab.capacidadMaxima
      ? Math.min(100, Math.round((session.totalEstudiantes / lab.capacidadMaxima) * 100))
      : 0

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <header className={`${bg} px-4 py-3 text-white`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold opacity-80">{lab.codigo}</p>
            <h3 className="truncate text-base font-bold">{lab.nombre}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
            {badge}
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {lab.estado === "EN_MANTENIMIENTO" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
            <Wrench className="h-10 w-10 text-[#D97706]" aria-hidden="true" />
            <p className="text-base font-semibold text-[#D97706]">En mantenimiento</p>
            <p className="text-sm text-[#6B7280]">Temporalmente fuera de servicio</p>
          </div>
        ) : lab.estado === "CERRADO" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
            <Lock className="h-10 w-10 text-[#6B7280]" aria-hidden="true" />
            <p className="text-base font-semibold text-[#6B7280]">Cerrado</p>
            <p className="text-sm text-[#6B7280]">No disponible hoy</p>
          </div>
        ) : session ? (
          <>
            <p className="text-[15px] font-semibold text-[#1F2937]">{session.materia}</p>
            <div className="flex items-center gap-2 text-sm text-[#374151]">
              <User className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden="true" />
              <span className="truncate">{session.docente}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#374151]">
              <Clock className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden="true" />
              <span>
                {session.horaInicio} &ndash; {session.horaFin}
              </span>
            </div>

            {/* Occupancy */}
            <div className="mt-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className={`h-full rounded-full transition-all ${occupancyColor(pct)}`}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                {session.totalEstudiantes} / {lab.capacidadMaxima} estudiantes
              </p>
            </div>

            {next && (
              <div className="mt-2 border-t border-[#E5E7EB] pt-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                  Próxima sesión
                </p>
                <p className="text-[13px] text-[#1F2937]">
                  {next.materia} · {next.horaInicio} &ndash; {next.horaFin}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
            <CalendarCheck className="h-10 w-10 text-[#16A34A]" aria-hidden="true" />
            <p className="text-base font-semibold text-[#16A34A]">Disponible</p>
            {next ? (
              <div className="mt-1 w-full border-t border-[#E5E7EB] pt-2 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                  Próxima sesión
                </p>
                <p className="text-sm font-medium text-[#1F2937]">{next.materia}</p>
                <p className="text-[13px] text-[#374151]">{next.docente}</p>
                <p className="text-[13px] text-[#374151]">
                  {next.horaInicio} &ndash; {next.horaFin}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-[#6B7280]">Sin más sesiones hoy</p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
