import { useCallback, useState } from "react"
import { Plus, Power, PowerOff } from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { Card, CardHeader, CardBody } from "../../components/Card"
import { DataTable } from "../../components/DataTable"
import { Button } from "../../components/Button"
import { StatusBadge } from "../../components/Badge"
import { RowActions } from "../../components/RowActions"
import { Modal } from "../../components/Modal"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { Field, Input } from "../../components/Field"
import { formatDate } from "../../lib/utils"

const empty = { name: "", startDate: "", endDate: "" }

export function PeriodsTab() {
  const toast = useToast()
  const loadAll = useCallback(async () => {
    const [list, active] = await Promise.all([
      api.get("/academic-periods"),
      api.get("/academic-periods/active").catch(() => null),
    ])
    return { list: asList(list), active }
  }, [])
  const { data, loading, refetch } = useAsync(loadAll, [])
  const periods = data?.list || []
  const activePeriod = data?.active || null

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [busyId, setBusyId] = useState(null)

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({ name: p.name || "", startDate: p.startDate || "", endDate: p.endDate || "" })
    setModalOpen(true)
  }

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      toast.error("La fecha de inicio debe ser anterior a la fecha de fin.")
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/academic-periods/${editing.id}`, form)
        toast.success("Periodo actualizado correctamente.")
      } else {
        await api.post("/academic-periods", form)
        toast.success("Periodo creado correctamente.")
      }
      setModalOpen(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate(p) {
    setBusyId(p.id)
    try {
      await api.patch(`/academic-periods/${p.id}/activate`)
      toast.success("Periodo activado correctamente.")
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleClose(p) {
    setBusyId(p.id)
    try {
      await api.patch(`/academic-periods/${p.id}/close`)
      toast.success("Periodo cerrado correctamente.")
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.del(`/academic-periods/${toDelete.id}`)
      toast.success("Periodo eliminado correctamente.")
      setToDelete(null)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "startDate", header: "Inicio", render: (r) => formatDate(r.startDate) },
    { key: "endDate", header: "Fin", render: (r) => formatDate(r.endDate) },
    { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === "ACTIVE" ? (
            <Button size="sm" variant="ghost" loading={busyId === r.id} onClick={() => handleClose(r)}>
              <PowerOff className="h-4 w-4" />
              Cerrar
            </Button>
          ) : (
            <Button size="sm" variant="ghost" loading={busyId === r.id} onClick={() => handleActivate(r)}>
              <Power className="h-4 w-4" />
              Activar
            </Button>
          )}
          <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
        </div>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader
        title="Periodos académicos"
        subtitle={
          activePeriod
            ? `Periodo activo: ${activePeriod.name}. Solo puede existir un periodo activo a la vez.`
            : "No hay ningún periodo activo. Activa uno para habilitar horarios y sesiones."
        }
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo Periodo
          </Button>
        }
      />
      <CardBody className="p-0">
        <DataTable columns={columns} data={periods} loading={loading} emptyMessage="No hay periodos registrados." />
      </CardBody>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar periodo" : "Nuevo periodo"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="period-form" loading={saving}>
              {editing ? "Guardar cambios" : "Crear periodo"}
            </Button>
          </>
        }
      >
        <form id="period-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre" required>
            <Input
              required
              placeholder="Ej. 2025-I"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha inicio" required>
              <Input type="date" required value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="Fecha fin" required>
              <Input type="date" required value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
          </div>
          <p className="rounded-lg border border-info/30 bg-info/10 px-3 py-2.5 text-sm text-info">
            El estado del periodo se gestiona con las acciones Activar / Cerrar de la tabla.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar periodo"
        message={`¿Seguro que deseas eliminar el periodo "${toDelete?.name}"? Esta acción no se puede deshacer.`}
      />
    </Card>
  )
}
