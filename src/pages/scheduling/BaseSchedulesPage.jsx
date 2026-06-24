import { useCallback, useMemo, useState } from "react"
import { Plus, CalendarPlus, Trash2, CalendarRange } from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { usePeriod } from "../../context/PeriodContext"
import { useCatalogs, DAYS, resolveDay } from "../../lib/catalogs"
import { formatTime } from "../../lib/utils"
import { PageHeader } from "../../components/PageHeader"
import { Card, CardBody } from "../../components/Card"
import { Button } from "../../components/Button"
import { Modal } from "../../components/Modal"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { Field, Input, Select } from "../../components/Field"
import { ScheduleSlotModal } from "./ScheduleSlotModal"

const START_HOUR = 7
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

const PALETTE = [
  "border-l-info bg-info/10",
  "border-l-success bg-success/10",
  "border-l-warning bg-warning/10",
  "border-l-primary bg-primary/10",
  "border-l-danger bg-danger/10",
]

function toMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

export function BaseSchedulesPage() {
  const toast = useToast()
  const { selectedId: periodoId, selected } = usePeriod()
  const catalogs = useCatalogs()

  const [labFilter, setLabFilter] = useState("")

  const load = useCallback(() => {
    if (!periodoId) return Promise.resolve([])
    return api.get(`/base-schedules?periodoId=${periodoId}`)
  }, [periodoId])

  const { data, loading, refetch } = useAsync(load, [periodoId])
  const allSlots = asList(data)

  const slots = useMemo(
    () => (labFilter ? allSlots.filter((s) => String(s.laboratorioId) === String(labFilter)) : allSlots),
    [allSlots, labFilter],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [genOpen, setGenOpen] = useState(false)

  // Assign a stable color per subject id.
  const subjectColor = useMemo(() => {
    const map = new Map()
    let i = 0
    for (const s of slots) {
      const key = s.materiaId ?? s.materia
      if (!map.has(key)) {
        map.set(key, PALETTE[i % PALETTE.length])
        i += 1
      }
    }
    return map
  }, [slots])

  function openCreate(day, hour) {
    setEditing(null)
    setDefaults({
      laboratorioId: labFilter || "",
      ...(day
        ? {
            diaSemana: day,
            horaInicio: `${String(hour).padStart(2, "0")}:00`,
            horaFin: `${String(Math.min(hour + 2, END_HOUR)).padStart(2, "0")}:00`,
          }
        : {}),
    })
    setModalOpen(true)
  }

  function openEdit(slot) {
    setEditing(slot)
    setDefaults(null)
    setModalOpen(true)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.del(`/base-schedules/${toDelete.id}`)
      toast.success("Horario eliminado correctamente.")
      setToDelete(null)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (!periodoId) {
    return (
      <div>
        <PageHeader title="Horario Base" description="Plantilla semanal de clases por periodo." />
        <Card>
          <CardBody className="py-12 text-center text-muted-foreground">
            Selecciona un periodo activo en la barra superior para gestionar el horario base.
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Horario Base"
        description={`Plantilla semanal de clases${selected ? ` · ${selected.nombre}` : ""}.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setGenOpen(true)}>
              <CalendarPlus className="h-4 w-4" />
              Generar sesiones
            </Button>
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Nuevo horario
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-72">
            <Select value={labFilter} onChange={(e) => setLabFilter(e.target.value)}>
              <option value="">Todos los laboratorios</option>
              {catalogs.laboratories.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo ? `${l.codigo} · ` : ""}
                  {l.nombre}
                </option>
              ))}
            </Select>
          </div>
          <span className="text-sm text-muted-foreground sm:ml-auto">{slots.length} bloque(s)</span>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Cargando horario…</div>
          ) : (
            <div className="grid min-w-[820px]" style={{ gridTemplateColumns: `64px repeat(${DAYS.length}, 1fr)` }}>
              <div className="border-b border-r border-border bg-muted/50" />
              {DAYS.map((d) => (
                <div
                  key={d.value}
                  className="border-b border-r border-border bg-muted/50 py-2.5 text-center text-sm font-semibold text-foreground"
                >
                  {d.label}
                </div>
              ))}

              {HOURS.map((hour) => (
                <Row
                  key={hour}
                  hour={hour}
                  slots={slots}
                  catalogs={catalogs}
                  subjectColor={subjectColor}
                  onCellClick={openCreate}
                  onSlotClick={openEdit}
                  onSlotDelete={setToDelete}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ScheduleSlotModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
        catalogs={catalogs}
        periodoId={periodoId}
        editing={editing}
        defaults={defaults}
      />

      <GenerateSessionsModal open={genOpen} onClose={() => setGenOpen(false)} periodoId={periodoId} selected={selected} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar horario base"
        message="Se eliminará este bloque del horario. Las sesiones ya generadas no se modificarán."
      />
    </div>
  )
}

function Row({ hour, slots, catalogs, subjectColor, onCellClick, onSlotClick, onSlotDelete }) {
  const label = `${String(hour).padStart(2, "0")}:00`
  return (
    <>
      <div className="border-b border-r border-border bg-muted/30 px-2 py-3 text-right text-xs text-muted-foreground">
        {label}
      </div>
      {DAYS.map((d) => {
        const cellSlots = slots.filter((s) => {
          const day = resolveDay(s.diaSemana)
          const start = toMinutes((s.horaInicio || "").slice(0, 5))
          return day?.value === d.value && start >= hour * 60 && start < (hour + 1) * 60
        })
        return (
          <div
            key={d.value}
            className="relative min-h-16 border-b border-r border-border p-1"
          >
            {cellSlots.length === 0 ? (
              <button
                type="button"
                onClick={() => onCellClick(d.value, hour)}
                className="h-full min-h-14 w-full rounded-md text-left transition-colors hover:bg-accent/50"
                aria-label={`Agregar clase el ${d.label} a las ${label}`}
              />
            ) : (
              cellSlots.map((s) => (
                <div
                  key={s.id}
                  className={`group relative mb-1 rounded-md border-l-4 px-2 py-1.5 text-xs ${
                    subjectColor.get(s.materiaId ?? s.materia) || "border-l-border bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSlotClick(s)}
                    className="block w-full text-left"
                  >
                    <span className="block font-semibold text-foreground">
                      {s.materiaNombre || s.materia || catalogs.subjectName(s.materiaId)}
                    </span>
                    <span className="block text-muted-foreground">
                      {formatTime(s.horaInicio)}–{formatTime(s.horaFin)}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {s.laboratorioNombre || s.laboratorio || catalogs.labName(s.laboratorioId)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSlotDelete(s)}
                    aria-label="Eliminar bloque"
                    className="absolute right-1 top-1 hidden rounded p-0.5 text-muted-foreground hover:bg-danger/15 hover:text-danger group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )
      })}
    </>
  )
}

function GenerateSessionsModal({ open, onClose, periodoId, selected }) {
  const toast = useToast()
  const [range, setRange] = useState({ fechaInicio: "", fechaFin: "" })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  function setField(field, val) {
    setRange((r) => ({ ...r, [field]: val }))
    setResult(null)
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (range.fechaInicio > range.fechaFin) {
      toast.error("La fecha de inicio debe ser anterior a la fecha de fin.")
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await api.post("/sessions/generate", {
        periodoId: Number(periodoId),
        fechaInicio: range.fechaInicio,
        fechaFin: range.fechaFin,
      })
      const count = res?.generadas ?? res?.generated ?? res?.count ?? (Array.isArray(res) ? res.length : null)
      setResult(count != null ? `Se generaron ${count} sesión(es) correctamente.` : "Sesiones generadas correctamente.")
      toast.success("Sesiones generadas.")
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generar sesiones del periodo"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
          <Button type="submit" form="gen-form" loading={loading}>
            <CalendarRange className="h-4 w-4" />
            Generar
          </Button>
        </>
      }
    >
      <form id="gen-form" onSubmit={handleGenerate} className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Se crearán sesiones concretas a partir del horario base{selected ? ` de ${selected.nombre}` : ""} para cada
          fecha dentro del rango seleccionado.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha inicio" required>
            <Input type="date" required value={range.fechaInicio} onChange={(e) => setField("fechaInicio", e.target.value)} />
          </Field>
          <Field label="Fecha fin" required>
            <Input type="date" required value={range.fechaFin} onChange={(e) => setField("fechaFin", e.target.value)} />
          </Field>
        </div>
        {result && (
          <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
            {result}
          </div>
        )}
      </form>
    </Modal>
  )
}
