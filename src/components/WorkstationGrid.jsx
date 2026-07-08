import { wsStatusMeta, WS_STATUS_META, EQUIPMENT_STATUS_LABEL } from "../lib/labUi"

/**
 * Visual grid of workstations. Each cell is colored by status and shows a
 * tooltip with its equipment specs on hover (desktop) or tap (mobile).
 *
 * props:
 *  - workstations: [{ id, code, status, equipment?: {...} }]
 *  - onSelect?: (workstation) => void   // e.g. open a detail/edit modal
 *  - cell?: number                      // cell size in px (default 28)
 */
export function WorkstationGrid({ workstations = [], onSelect, cell = 28 }) {
  if (!workstations.length) {
    return <p className="text-sm text-[#6B7280]">Esta aula no tiene estaciones registradas.</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Estaciones de trabajo">
      {workstations.map((ws) => {
        const meta = wsStatusMeta(ws.status)
        const eq = ws.equipment
        return (
          <div key={ws.id} className="group relative" role="listitem">
            <button
              type="button"
              onClick={() => onSelect?.(ws)}
              className="flex items-center justify-center rounded-md border text-[9px] font-semibold transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003B7A]"
              style={{
                width: cell,
                height: cell,
                backgroundColor: meta.bg,
                borderColor: meta.border,
                color: meta.dot,
              }}
              aria-label={`Estación ${ws.code} — ${meta.label}`}
            >
              {ws.code}
            </button>
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-44 -translate-x-1/2 rounded-lg bg-[#1F2937] px-3 py-2 text-left text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block">
              <p className="font-semibold">Estación {ws.code}</p>
              {eq ? (
                <>
                  <p className="text-white/90">
                    {eq.categoryName ? `${eq.categoryName} — ` : ""}
                    {EQUIPMENT_STATUS_LABEL[eq.status] || eq.status}
                  </p>
                  <p className="text-white/70">
                    <span className="font-mono">{eq.code}</span>
                    {eq.name ? `: ${eq.name}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-white/70">Sin equipo asignado</p>
              )}
              <p className="mt-0.5 font-medium" style={{ color: meta.dot }}>
                {meta.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Compact legend shown below the grid. */
export function WorkstationLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {Object.entries(WS_STATUS_META).map(([key, meta]) => (
        <div key={key} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm border"
            style={{ backgroundColor: meta.bg, borderColor: meta.border }}
            aria-hidden="true"
          />
          <span className="text-xs text-[#6B7280]">{meta.label}</span>
        </div>
      ))}
    </div>
  )
}
