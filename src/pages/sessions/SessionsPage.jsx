import { useCallback, useState } from "react"
import {
  CalendarDays,
  Clock,
  User,
  PlayCircle,
  CheckCircle2,
  XCircle,
  UserCheck,
} from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { usePeriod } from "../../context/PeriodContext"
import { useCatalogs } from "../../lib/catalogs"
import { formatTime, formatDate } from "../../lib/utils"
import { PageHeader } from "../../components/PageHeader"
import { Card, CardBody } from "../../components/Card"
import { Button } from "../../components/Button"
import { StatusBadge } from "../../components/Badge"
import { Field, Select } from "../../components/Field"
import { ConfirmDialog } from "../../components/ConfirmDialog"

const STATUSES = [
  { value: "SCHEDULED", label: "Programada" },
  { value: "IN_PROGRESS", label: "En curso" },
  { value: "FINISHED", label: "Finalizada" },
  { value: "CANCELLED", label: "Cancelada" },
]

const ATTENDANCES = [
  { value: "ARRIVED", label: "Llegó" },
  { value: "LATE", label: "Retraso" },
  { value: "ABSENT", label: "No llegó" },
]

const today = () => new Date().toISOString().slice(0, 10)

export function SessionsPage() {
  const toast = useToast()
  const { selectedId: academicPeriodId, selected } = usePeriod()
  const catalogs = useCatalogs()

  const [filters, setFilters] = useState({ status: "", laboratoryId: "", date: "" })
  const [busyId, setBusyId] = useState(null)
  const [toCancel, setToCancel] = useState(null)
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(() => {
    if (!academicPeriodId) return Promise.resolve([])
    const qs = new URLSearchParams({ academicPeriodId: String(academicPeriodId) })
    if (filters.status) qs.set("status", filters.status)
    if (filters.laboratoryId) qs.set("laboratoryId", filters.laboratoryId)
    if (filters.date) qs.set("date", filters.date)
    return api.get(`/sessions?${qs.toString()}`)
  }, [academicPeriodId, filters.status, filters.laboratoryId, filters.date])

  const { data, loading, refetch } = useAsync(load, [
    academicPeriodId,
    filters.status,
    filters.laboratoryId,
    filters.date,
  ])
  const sessions = asList(data)

  function setFilter(field, val) {
    setFilters((f) => ({ ...f, [field]: val }))
  }

  async function changeStatus(session, status) {
    setBusyId(session.id)
    try {
      await api.patch(`/sessions/${session.id}/status`, { status })
      toast.success("Sesión actualizada correctamente.")
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function registerAttendance(session, teacherAttendance) {
    setBusyId(session.id)
    try {
      await api.patch(`/sessions/${session.id}/teacher-attendance`, { teacherAttendance })
      toast.success("Asistencia registrada correctamente.")
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel() {
    setCanceling(true)
    try {
      await api.patch(`/sessions/${toCancel.id}/cancel`)
      toast.success("Sesión cancelada correctamente.")
      setToCancel(null)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCanceling(false)
    }
  }

  if (!academicPeriodId) {
    return (
      <div>
        <PageHeader title="Sesiones" description="Seguimiento y control de asistencia de las clases." />
        <Card>
          <CardBody className="py-12 text-center text-muted-foreground">
            Selecciona un periodo activo en la barra superior para ver las sesiones.
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Sesiones"
        description={`Seguimiento y control de asistencia${selected ? ` · ${selected.name}` : ""}.`}
        actions={
          <Button variant="secondary" onClick={() => setFilter("date", today())}>
            <CalendarDays className="h-4 w-4" />
            Hoy
          </Button>
        }
      />

      <Card className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <Field label="Estado">
            <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">Todos</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Laboratorio">
            <Select value={filters.laboratoryId} onChange={(e) => setFilter("laboratoryId", e.target.value)}>
              <option value="">Todos</option>
              {catalogs.laboratories.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code ? `${l.code} · ` : ""}
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha">
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilter("date", e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </CardBody>
      </Card>

      {loading ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-muted-foreground">Cargando sesiones…</CardBody>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-muted-foreground">
            No hay sesiones para los filtros seleccionados.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              catalogs={catalogs}
              busy={busyId === s.id}
              onStart={() => changeStatus(s, "IN_PROGRESS")}
              onComplete={() => changeStatus(s, "FINISHED")}
              onCancel={() => setToCancel(s)}
              onAttendance={(v) => registerAttendance(s, v)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        onConfirm={handleCancel}
        loading={canceling}
        title="Cancelar sesión"
        confirmLabel="Cancelar sesión"
        message="¿Seguro que deseas cancelar esta sesión? Esta acción puede afectar el reporte de asistencia."
      />
    </div>
  )
}

function SessionCard({ session: s, catalogs, busy, onStart, onComplete, onCancel, onAttendance }) {
  const finished = s.status === "FINISHED" || s.status === "CANCELLED"
  const attendance = s.teacherAttendance && s.teacherAttendance !== "NOT_RECORDED" ? s.teacherAttendance : null
  return (
    <Card>
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">
              {s.subjectName || catalogs.subjectName(s.subjectId)}
            </h3>
            <StatusBadge value={s.status} />
            {attendance && <StatusBadge value={attendance} />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(s.date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(s.startTime)}–{formatTime(s.endTime)}
            </span>
            <span>{s.laboratoryName || catalogs.labName(s.laboratoryId)}</span>
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {s.teacherName || catalogs.teacherName(s.teacherId)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {s.status === "SCHEDULED" && (
            <Button size="sm" variant="secondary" loading={busy} onClick={onStart}>
              <PlayCircle className="h-4 w-4" />
              Iniciar
            </Button>
          )}
          {(s.status === "SCHEDULED" || s.status === "IN_PROGRESS") && (
            <>
              <div className="w-40">
                <Select
                  aria-label="Registrar asistencia del docente"
                  value={attendance || ""}
                  disabled={busy}
                  onChange={(e) => e.target.value && onAttendance(e.target.value)}
                >
                  <option value="">Asistencia…</option>
                  {ATTENDANCES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button size="sm" loading={busy} onClick={onComplete}>
                <CheckCircle2 className="h-4 w-4" />
                Finalizar
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
                <XCircle className="h-4 w-4" />
                Cancelar
              </Button>
            </>
          )}
          {finished && !attendance && s.status === "FINISHED" && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5" />
              Sin asistencia registrada
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
