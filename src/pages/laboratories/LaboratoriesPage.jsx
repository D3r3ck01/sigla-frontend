import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { PageHeader } from "../../components/PageHeader"
import { Card, CardBody } from "../../components/Card"
import { DataTable } from "../../components/DataTable"
import { Button } from "../../components/Button"
import { StatusBadge } from "../../components/Badge"
import { RowActions } from "../../components/RowActions"
import { Modal } from "../../components/Modal"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { Field, Input, Select } from "../../components/Field"

const STATES = [
  { value: "ACTIVE", label: "Activo" },
  { value: "UNDER_MAINTENANCE", label: "En mantenimiento" },
  { value: "CLOSED", label: "Cerrado" },
]

const empty = { code: "", name: "", categoryId: "", capacity: "", status: "ACTIVE", facultyId: "" }

export function LaboratoriesPage() {
  const toast = useToast()
  const { data, loading, refetch } = useAsync(() => api.get("/laboratories"), [])
  const labs = asList(data)

  const { data: facultiesData } = useAsync(() => api.get("/faculties"), [])
  const faculties = asList(facultiesData)
  const facultyName = (id) => faculties.find((f) => f.id === id)?.name || "—"

  const { data: categoriesData } = useAsync(() => api.get("/laboratory-categories"), [])
  const categories = asList(categoriesData)
  const categoryName = (id) => categories.find((c) => c.id === id)?.name || "—"

  const [categoryFilter, setCategoryFilter] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [search, setSearch] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    return labs.filter((l) => {
      if (categoryFilter && String(l.categoryId) !== String(categoryFilter)) return false
      if (stateFilter && l.status !== stateFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${l.name || ""} ${l.code || ""}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [labs, categoryFilter, stateFilter, search])

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setModalOpen(true)
  }

  function openEdit(l) {
    setEditing(l)
    setForm({
      code: l.code || "",
      name: l.name || "",
      categoryId: l.categoryId || "",
      capacity: l.capacity ?? "",
      status: l.status || "ACTIVE",
      facultyId: l.facultyId || "",
    })
    setModalOpen(true)
  }

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, capacity: Number(form.capacity) || 0 }
    try {
      if (editing) {
        await api.put(`/laboratories/${editing.id}`, payload)
        toast.success("Laboratorio actualizado correctamente.")
      } else {
        await api.post("/laboratories", payload)
        toast.success("Laboratorio creado correctamente.")
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
      await api.del(`/laboratories/${toDelete.id}`)
      toast.success("Laboratorio eliminado correctamente.")
      setToDelete(null)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs font-medium">{r.code}</span> },
    { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "faculty", header: "Facultad", render: (r) => facultyName(r.facultyId) },
    { key: "category", header: "Categoría", render: (r) => categoryName(r.categoryId) },
    { key: "capacity", header: "Capacidad", align: "center", render: (r) => r.capacity },
    { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Laboratorios"
        description="Administra los laboratorios, su tipo, capacidad y estado."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo Laboratorio
          </Button>
        }
      />

      <Card>
        <CardBody className="border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="sm:w-44">
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="sm:w-48">
              <option value="">Todos los estados</option>
              {STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
        <CardBody className="p-0">
          <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="No se encontraron laboratorios." />
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar laboratorio" : "Nuevo laboratorio"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="lab-form" loading={saving}>
              {editing ? "Guardar cambios" : "Crear laboratorio"}
            </Button>
          </>
        }
      >
        <form id="lab-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código" required>
              <Input required placeholder="Ej. LAB-101" value={form.code} onChange={(e) => set("code", e.target.value)} />
            </Field>
            <Field label="Capacidad máxima" required>
              <Input type="number" min="0" required value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </Field>
          </div>
          <Field label="Nombre" required>
            <Input required placeholder="Ej. Laboratorio de Cómputo 1" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Facultad" required>
            <Select required value={form.facultyId} onChange={(e) => set("facultyId", e.target.value)}>
              <option value="">Selecciona una facultad…</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoría" required>
              <Select required value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Selecciona una categoría…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado" required>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar laboratorio"
        message={`¿Seguro que deseas eliminar "${toDelete?.name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
