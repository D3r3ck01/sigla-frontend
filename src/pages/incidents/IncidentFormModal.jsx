import { useEffect, useState } from "react"
import { api } from "../../lib/api"
import { asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { Modal } from "../../components/Modal"
import { Button } from "../../components/Button"
import { Field, Select, Textarea } from "../../components/Field"

const TYPES = [
  { value: "INCIDENT", label: "Incidencia" },
  { value: "REQUEST", label: "Solicitud" },
]

const CATEGORIES = [
  { value: "HARDWARE", label: "Hardware" },
  { value: "SOFTWARE", label: "Software" },
  { value: "NETWORKING", label: "Redes" },
  { value: "INFRASTRUCTURE", label: "Infraestructura" },
  { value: "OTHER", label: "Otro" },
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
    type: initial.type || "INCIDENT",
    category: initial.category || "HARDWARE",
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
  const [saving, setSaving] = useState(false)

  // Reset the form each time the modal opens (picking up new prefilled values).
  useEffect(() => {
    if (open) setForm(blankForm(initial))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.laboratoryId, initial.workstationId, initial.equipmentId])

  // Load workstations + equipment whenever the selected lab changes.
  useEffect(() => {
    if (!open || !form.laboratoryId) {
      setWorkstations([])
      setEquipment([])
      return
    }
    let active = true
    Promise.all([
      api.get(`/workstations?laboratoryId=${form.laboratoryId}`).catch(() => []),
      api.get(`/equipment?laboratoryId=${form.laboratoryId}`).catch(() => []),
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
        type: form.type,
        category: form.category,
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
                  {eq.brand} {eq.model}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Tipo" required>
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoría" required>
            <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
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
