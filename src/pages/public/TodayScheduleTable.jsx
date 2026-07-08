import { CalendarX } from "lucide-react"

const STATUS_META = {
  SCHEDULED: { label: "Programada", classes: "bg-[#0891B2]/10 text-[#0e7490]" },
  IN_PROGRESS: { label: "En curso", classes: "bg-[#D97706]/15 text-[#B45309]" },
  FINISHED: { label: "Finalizada", classes: "bg-[#16A34A]/15 text-[#15803D]" },
  CANCELLED: { label: "Cancelada", classes: "bg-[#DC2626]/15 text-[#B91C1C]" },
}

function StatusBadge({ value }) {
  const meta = STATUS_META[value] || { label: value || "—", classes: "bg-[#E5E7EB] text-[#6B7280]" }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.classes}`}>
      {meta.label}
    </span>
  )
}

/** A session is "past" when its end time is before the current clock time. */
function isPast(session, nowHM) {
  return session.endTime < nowHM && session.status !== "IN_PROGRESS"
}

export function TodayScheduleTable({ sessions, nowHM }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white py-12 text-center shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        <CalendarX className="h-10 w-10 text-[#6B7280]" aria-hidden="true" />
        <p className="text-sm text-[#6B7280]">No hay sesiones programadas para hoy.</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#003B7A] text-left text-white">
              <th className="px-4 py-3 font-semibold">Hora</th>
              <th className="px-4 py-3 font-semibold">Laboratorio</th>
              <th className="px-4 py-3 font-semibold">Materia</th>
              <th className="px-4 py-3 font-semibold">Docente</th>
              <th className="px-4 py-3 font-semibold">Estudiantes</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => {
              const past = isPast(s, nowHM)
              const current = s.status === "IN_PROGRESS"
              return (
                <tr
                  key={s.id}
                  className={`border-t border-[#E5E7EB] ${
                    i % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white"
                  } ${past ? "opacity-50" : ""} ${current ? "bg-[#D97706]/10" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-[#1F2937]">
                    <div className="flex items-center gap-2">
                      <span>
                        {s.startTime}&ndash;{s.endTime}
                      </span>
                      {current && (
                        <span className="rounded bg-[#C8102E] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          → AHORA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#374151]">
                    <span className="font-medium text-[#1F2937]">{s.labCode}</span>
                    <span className="block text-xs text-[#6B7280]">{s.laboratory}</span>
                  </td>
                  <td className="px-4 py-3 text-[#374151]">{s.subject}</td>
                  <td className="px-4 py-3 text-[#374151]">{s.teacher}</td>
                  <td className="px-4 py-3 text-[#374151]">{s.totalStudents}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={s.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {sessions.map((s) => {
          const past = isPast(s, nowHM)
          const current = s.status === "IN_PROGRESS"
          return (
            <div
              key={s.id}
              className={`rounded-xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
                past ? "opacity-50" : ""
              } ${current ? "ring-2 ring-[#C8102E]" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-bold text-[#1F2937]">
                  {s.startTime}&ndash;{s.endTime}
                  {current && (
                    <span className="rounded bg-[#C8102E] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      → AHORA
                    </span>
                  )}
                </p>
                <StatusBadge value={s.status} />
              </div>
              <p className="mt-1 text-sm font-semibold text-[#1F2937]">{s.subject}</p>
              <p className="text-[13px] text-[#6B7280]">
                Lab: {s.labCode} · {s.laboratory}
              </p>
              <p className="text-[13px] text-[#374151]">{s.teacher}</p>
            </div>
          )
        })}
      </div>
    </>
  )
}
