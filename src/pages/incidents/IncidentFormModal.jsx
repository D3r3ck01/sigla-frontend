import { useEffect, useState } from "react"
import { api } from "../../lib/api"
import { asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { Modal } from "../../components/Modal"
import { Button } from "../../components/Button"
import { Field, Select, Textarea } from "../../components/Field"

const SEVERITIES = [
  { value: "MINOR", label: "Menor" },
  { value: "MAJOR", label: "Mayor" },
  { value: "CRITICAL", label: "Crítica" },
]

const PRIORITIES = [
  { value: "LOW", label: "Baja" },
  { value: "MEDIUM", label: "Media" },
  { value: "HIGH", label: "Alta" },
  { value: "CRITICAL", label: "Crítica" },
]

function blankForm(initial = {}) {
  return {
    laboratoryId: initial.laboratoryId || "",
    workstationId: initial.workstationId || "",
    equipmentId: initial.equipmentId || "",
    typeId: initial.typeId || "",
    severity: initial.severity || "MINOR",
    description: initial.description || "",
    priority: initial.priority || "MEDIUM",
  }
}

/**
 * Reusable "create incident" modal.
 *
 * props:
 *  - open, onClose
 *  - onCreated(): callback after a successful POST /incidents
 *  - labs: laboratory list for the selector
 *  - initial: { laboratoryId?, workstationId?, equipmentId? } to prefill (e.g. from inventory)
 */
export function IncidentFormModal({ open, onClose, onCreated, labs = [], initial = {} }) {
  const toast = useToast()
  const [form, setForm] = useState(() => blankForm(initial))
  const [workstations, setWorkstations] = useState([])
  const [equipment, setEquipment] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [saving, setSaving] = useState(false)

  // Reset the form each time the modal opens (picking up new prefilled values).
  useEffect(() => {
    if (open) setForm(blankForm(initial))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.laboratoryId, initial.workstationId, initial.equipmentId])

  // Load incident types once the modal opens.
  useEffect(() => {
    if (!open) return
    let active = true
    api
      .get("/incident-types")
      .catch(() => [])
      .then((types) => {
        if (!active) return
        const list = asList(types)
        setIncidentTypes(list)
        // Default typeId to the first available type if none selected yet.
        setForm((f) => (f.typeId ? f : { ...f, typeId: list[0]?.id || "" }))
      })
    return () => {
      active = false
    }
  }, [open])

  // Load workstations + equipment whenever the selected lab changes.
  useEffect(() => {
    if (!open || !form.laboratoryId) {
      setWorkstations([])
      setEquipment([])
      return
    }
    let active = true
    Promise.all([
      api.get(`/laboratories/${form.laboratoryId}/workstations`).catch(() => []),
      api.get(`/laboratories/${form.laboratoryId}/equipment`).catch(() => []),
    ]).then(([ws, eq]) => {
      if (!active) return
      setWorkstations(asList(ws))
      setEquipment(asList(eq))
    })
    return () => {
      active = false
    }
  }, [open, form.laboratoryId])

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.laboratoryId || !form.description.trim()) return
    setSaving(true)
    try {
      await api.post("/incidents", {
        laboratoryId: form.laboratoryId,
        workstationId: form.workstationId || null,
        equipmentId: form.equipmentId || null,
        typeId: form.typeId || null,
        severity: form.severity,
        description: form.description.trim(),
        priority: form.priority,
      })
      toast.success("Incidencia registrada correctamente.")
      onClose?.()
      onCreated?.()
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
      title="Nueva incidencia"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="incident-form" loading={saving}>
            Registrar incidencia
          </Button>
        </>
      }
    >
      <form id="incident-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Laboratorio" required>
          <Select
            required
            value={form.laboratoryId}
            onChange={(e) => {
              set("laboratoryId", e.target.value)
              set("workstationId", "")
              set("equipmentId", "")
            }}
          >
            <option value="">Selecciona un laboratorio…</option>
            {labs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} — {l.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Estación (opcional)">
            <Select
              value={form.workstationId}
              disabled={!form.laboratoryId}
              onChange={(e) => set("workstationId", e.target.value)}
            >
              <option value="">Sin estación específica</option>
              {workstations.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Equipo (opcional)">
            <Select
              value={form.equipmentId}
              disabled={!form.laboratoryId}
              onChange={(e) => set("equipmentId", e.target.value)}
            >
              <option value="">Sin equipo específico</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.code} — {eq.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Tipo" required>
            <Select required value={form.typeId} onChange={(e) => set("typeId", e.target.value)}>
              <option value="">Selecciona un tipo…</option>
              {incidentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severidad" required>
            <Select value={form.severity} onChange={(e) => set("severity", e.target.value)}>
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad" required>
            <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Descripción" required>
          <Textarea
            required
            placeholder="Describe la incidencia o solicitud…"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  )
}
