import { useEffect, useMemo, useState } from "react"
import { api } from "../../lib/api"
import { useToast } from "../../context/ToastContext"
import { DAYS } from "../../lib/catalogs"
import { Modal } from "../../components/Modal"
import { Button } from "../../components/Button"
import { Field, Input, Select } from "../../components/Field"

const empty = {
  laboratorioId: "",
  docenteId: "",
  materiaId: "",
  diaSemana: "LUNES",
  horaInicio: "08:00",
  horaFin: "10:00",
}

export function ScheduleSlotModal({ open, onClose, onSaved, catalogs, periodoId, editing, defaults }) {
  const toast = useToast()
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        laboratorioId: editing.laboratorioId ?? "",
        docenteId: editing.docenteId ?? "",
        materiaId: editing.materiaId ?? "",
        diaSemana: editing.diaSemana ?? "LUNES",
        horaInicio: (editing.horaInicio || "08:00").slice(0, 5),
        horaFin: (editing.horaFin || "10:00").slice(0, 5),
      })
    } else {
      setForm({ ...empty, ...defaults })
    }
  }, [open, editing, defaults])

  // When a teacher is selected, restrict subjects to the ones assigned to them.
  const subjectOptions = useMemo(() => {
    if (!form.docenteId) return catalogs.subjects
    const teacher = catalogs.teachers.find((t) => String(t.id) === String(form.docenteId))
    const assigned = teacher?.materiasAsignadas
    if (!assigned || assigned.length === 0) return catalogs.subjects
    return catalogs.subjects.filter((s) => assigned.includes(s.id))
  }, [form.docenteId, catalogs.subjects, catalogs.teachers])

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.horaInicio >= form.horaFin) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin.")
      return
    }
    setSaving(true)
    const payload = {
      periodoId: Number(periodoId),
      laboratorioId: Number(form.laboratorioId),
      docenteId: Number(form.docenteId),
      materiaId: Number(form.materiaId),
      diaSemana: form.diaSemana,
      horaInicio: form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio,
      horaFin: form.horaFin.length === 5 ? `${form.horaFin}:00` : form.horaFin,
    }
    try {
      if (editing) {
        await api.put(`/base-schedules/${editing.id}`, payload)
        toast.success("Horario actualizado correctamente.")
      } else {
        await api.post("/base-schedules", payload)
        toast.success("Horario creado correctamente.")
      }
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar horario base" : "Nuevo horario base"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="slot-form" loading={saving}>
            {editing ? "Guardar cambios" : "Crear horario"}
          </Button>
        </>
      }
    >
      <form id="slot-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Laboratorio" required>
          <Select required value={form.laboratorioId} onChange={(e) => set("laboratorioId", e.target.value)}>
            <option value="">Selecciona un laboratorio…</option>
            {catalogs.laboratories.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo ? `${l.codigo} · ` : ""}
                {l.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Docente" required>
          <Select required value={form.docenteId} onChange={(e) => set("docenteId", e.target.value)}>
            <option value="">Selecciona un docente…</option>
            {catalogs.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Materia" required>
          <Select required value={form.materiaId} onChange={(e) => set("materiaId", e.target.value)}>
            <option value="">Selecciona una materia…</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Día de la semana" required>
          <Select value={form.diaSemana} onChange={(e) => set("diaSemana", e.target.value)}>
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Hora inicio" required>
            <Input type="time" required value={form.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} />
          </Field>
          <Field label="Hora fin" required>
            <Input type="time" required value={form.horaFin} onChange={(e) => set("horaFin", e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
