import { useEffect, useMemo, useState } from "react"
import { api } from "../../lib/api"
import { useToast } from "../../context/ToastContext"
import { DAYS } from "../../lib/catalogs"
import { Modal } from "../../components/Modal"
import { Button } from "../../components/Button"
import { Field, Input, Select } from "../../components/Field"

const empty = {
  laboratoryId: "",
  teacherId: "",
  subjectId: "",
  weekDay: "MONDAY",
  startTime: "08:00",
  endTime: "10:00",
  registeredStudentCount: 30,
}

export function ScheduleSlotModal({ open, onClose, onSaved, catalogs, academicPeriodId, editing, defaults }) {
  const toast = useToast()
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        laboratoryId: editing.laboratoryId ?? "",
        teacherId: editing.teacherId ?? "",
        subjectId: editing.subjectId ?? "",
        weekDay: editing.weekDay ?? "MONDAY",
        startTime: (editing.startTime || "08:00").slice(0, 5),
        endTime: (editing.endTime || "10:00").slice(0, 5),
        registeredStudentCount: editing.registeredStudentCount ?? 30,
      })
    } else {
      setForm({ ...empty, ...defaults })
    }
  }, [open, editing, defaults])

  // When a teacher is selected, restrict subjects to the ones assigned to them.
  const [assignedSubjectIds, setAssignedSubjectIds] = useState(null)
  useEffect(() => {
    let cancelled = false
    if (!form.teacherId) {
      setAssignedSubjectIds(null)
      return
    }
    api
      .get(`/users/${form.teacherId}/subject-assignments`)
      .then((res) => {
        if (cancelled) return
        const ids = (Array.isArray(res) ? res : []).map((a) => a.subjectId)
        setAssignedSubjectIds(ids)
      })
      .catch(() => {
        if (!cancelled) setAssignedSubjectIds(null)
      })
    return () => {
      cancelled = true
    }
  }, [form.teacherId])

  const subjectOptions = useMemo(() => {
    if (!assignedSubjectIds || assignedSubjectIds.length === 0) return catalogs.subjects
    return catalogs.subjects.filter((s) => assignedSubjectIds.includes(s.id))
  }, [assignedSubjectIds, catalogs.subjects])

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.startTime >= form.endTime) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin.")
      return
    }
    setSaving(true)
    const payload = {
      academicPeriodId,
      laboratoryId: form.laboratoryId,
      teacherId: form.teacherId,
      subjectId: form.subjectId,
      weekDay: form.weekDay,
      startTime: form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime,
      endTime: form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime,
      registeredStudentCount: Number(form.registeredStudentCount) || 0,
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
          <Select required value={form.laboratoryId} onChange={(e) => set("laboratoryId", e.target.value)}>
            <option value="">Selecciona un laboratorio…</option>
            {catalogs.laboratories.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code ? `${l.code} · ` : ""}
                {l.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Docente" required>
          <Select required value={form.teacherId} onChange={(e) => set("teacherId", e.target.value)}>
            <option value="">Selecciona un docente…</option>
            {catalogs.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {`${t.firstName} ${t.lastName}`.trim()}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Materia" required>
          <Select required value={form.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
            <option value="">Selecciona una materia…</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Día de la semana" required>
          <Select value={form.weekDay} onChange={(e) => set("weekDay", e.target.value)}>
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Hora inicio" required>
            <Input type="time" required value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Field>
          <Field label="Hora fin" required>
            <Input type="time" required value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </Field>
        </div>

        <Field label="Estudiantes registrados" required>
          <Input
            type="number"
            min="0"
            required
            value={form.registeredStudentCount}
            onChange={(e) => set("registeredStudentCount", e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  )
}
