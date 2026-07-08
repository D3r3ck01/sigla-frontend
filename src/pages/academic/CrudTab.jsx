import { useState } from "react"
import { Plus } from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { Card, CardHeader, CardBody } from "../../components/Card"
import { DataTable } from "../../components/DataTable"
import { Button } from "../../components/Button"
import { RowActions } from "../../components/RowActions"
import { Modal } from "../../components/Modal"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { Field, Input, Select } from "../../components/Field"

/**
 * Generic CRUD tab for simple entities.
 *
 * props:
 *  - title, subtitle, entityLabel, endpoint
 *  - columns: table columns (without the actions column)
 *  - fields: [{ name, label, type, required, options, placeholder }]
 *  - toForm(record): initial form values for editing
 *  - emptyForm: object
 *  - getName(record): for delete confirmation message
 */
export function CrudTab({
  title,
  subtitle,
  entityLabel,
  endpoint,
  columns,
  fields,
  emptyForm,
  toForm,
  toPayload,
  getName = (r) => r.name,
}) {
  const toast = useToast()
  const { data, loading, refetch } = useAsync(() => api.get(endpoint), [])
  const rows = asList(data)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(record) {
    setEditing(record)
    setForm(toForm ? toForm(record) : record)
    setModalOpen(true)
  }

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = toPayload ? toPayload(form) : form
    try {
      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, payload)
        toast.success(`${entityLabel} actualizado correctamente.`)
      } else {
        await api.post(endpoint, payload)
        toast.success(`${entityLabel} creado correctamente.`)
      }
      setModalOpen(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.del(`${endpoint}/${toDelete.id}`)
      toast.success(`${entityLabel} eliminado correctamente.`)
      setToDelete(null)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const allColumns = [
    ...columns,
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />,
    },
  ]

  const formId = `crud-form-${endpoint.replace(/\W/g, "")}`

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo {entityLabel}
          </Button>
        }
      />
      <CardBody className="p-0">
        <DataTable columns={allColumns} data={rows} loading={loading} emptyMessage={`No hay ${title.toLowerCase()}.`} />
      </CardBody>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${entityLabel.toLowerCase()}` : `Nuevo ${entityLabel.toLowerCase()}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} loading={saving}>
              {editing ? "Guardar cambios" : "Crear"}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <Field key={field.name} label={field.label} required={field.required}>
              {field.type === "select" ? (
                <Select
                  required={field.required}
                  value={form[field.name] ?? ""}
                  onChange={(e) => set(field.name, e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={field.type || "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  value={form[field.name] ?? ""}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              )}
            </Field>
          ))}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Eliminar ${entityLabel.toLowerCase()}`}
        message={`¿Seguro que deseas eliminar "${toDelete ? getName(toDelete) : ""}"? Esta acción no se puede deshacer.`}
      />
    </Card>
  )
}
