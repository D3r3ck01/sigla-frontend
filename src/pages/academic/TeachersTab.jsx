import { useCallback, useEffect, useState } from "react"
import { Plus, X, UserCheck, UserX } from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { Card, CardHeader, CardBody } from "../../components/Card"
import { DataTable } from "../../components/DataTable"
import { Button } from "../../components/Button"
import { Badge } from "../../components/Badge"
import { RowActions } from "../../components/RowActions"
import { Modal } from "../../components/Modal"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { Field, Input, Select } from "../../components/Field"

const empty = { firstName: "", lastName: "", email: "", password: "" }

export function TeachersTab() {
  const toast = useToast()
  const { data, loading, refetch } = useAsync(() => api.get("/users?role=TEACHER"), [])
  const teachers = asList(data).filter((u) => u.role === "TEACHER")

  const { data: subjectsData } = useAsync(() => api.get("/subjects"), [])
  const subjects = asList(subjectsData)
  const subjectName = useCallback((id) => subjects.find((s) => s.id === id)?.name || id, [subjects])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [busyId, setBusyId] = useState(null)

  // Assignment state (only meaningful when editing an existing teacher)
  const [assignments, setAssignments] = useState([])
  const [loadingAssign, setLoadingAssign] = useState(false)
  const [newSubjectId, setNewSubjectId] = useState("")
  const [addingSubject, setAddingSubject] = useState(false)

  const loadAssignments = useCallback(
    async (teacherId) => {
      if (!teacherId) return
      setLoadingAssign(true)
      try {
        const res = await api.get(`/users/${teacherId}/subject-assignments`)
        setAssignments(asList(res))
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoadingAssign(false)
      }
    },
    [toast],
  )

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setAssignments([])
    setModalOpen(true)
  }

  function openEdit(t) {
    setEditing(t)
    setForm({ firstName: t.firstName || "", lastName: t.lastName || "", email: t.email || "", password: "" })
    setNewSubjectId("")
    setModalOpen(true)
  }

  useEffect(() => {
    if (modalOpen && editing) loadAssignments(editing.id)
  }, [modalOpen, editing, loadAssignments])

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        })
        toast.success("Docente actualizado correctamente.")
      } else {
        await api.post("/users", {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          role: "TEACHER",
          enabled: true,
        })
        toast.success("Docente creado correctamente.")
      }
      setModalOpen(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled(t) {
    setBusyId(t.id)
    try {
      await api.patch(`/users/${t.id}/${t.enabled ? "disable" : "enable"}`)
      toast.success(t.enabled ? "Docente deshabilitado." : "Docente habilitado.")
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleAddSubject() {
    if (!newSubjectId || !editing) return
    setAddingSubject(true)
    try {
      await api.post("/teacher-subject-assignments", {
        teacherId: editing.id,
        subjectId: newSubjectId,
        status: "ACTIVE",
      })
      toast.success("Materia asignada correctamente.")
      setNewSubjectId("")
      await loadAssignments(editing.id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingSubject(false)
    }
  }

  async function handleRemoveSubject(assignmentId) {
    try {
      await api.del(`/teacher-subject-assignments/${assignmentId}`)
      toast.success("Materia desasignada correctamente.")
      await loadAssignments(editing.id)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.del(`/users/${toDelete.id}`)
      toast.success("Docente eliminado correctamente.")
      setToDelete(null)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const assignedSubjectIds = assignments.map((a) => a.subjectId)
  const availableSubjects = subjects.filter((s) => !assignedSubjectIds.includes(s.id))

  const columns = [
    {
      key: "name",
      header: "Nombre",
      render: (r) => <span className="font-medium">{`${r.firstName} ${r.lastName}`.trim()}</span>,
    },
    { key: "email", header: "Correo", render: (r) => <span className="text-muted-foreground">{r.email}</span> },
    {
      key: "enabled",
      header: "Estado",
      render: (r) => <Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "Habilitado" : "Deshabilitado"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" loading={busyId === r.id} onClick={() => toggleEnabled(r)}>
            {r.enabled ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            {r.enabled ? "Deshabilitar" : "Habilitar"}
          </Button>
          <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
        </div>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader
        title="Docentes"
        subtitle="Gestiona docentes (usuarios) y sus materias asignadas."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo Docente
          </Button>
        }
      />
      <CardBody className="p-0">
        <DataTable columns={columns} data={teachers} loading={loading} emptyMessage="No hay docentes registrados." />
      </CardBody>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar docente" : "Nuevo docente"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="teacher-form" loading={saving}>
              {editing ? "Guardar cambios" : "Crear docente"}
            </Button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombres" required>
              <Input required placeholder="Ej. Carlos" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Apellidos" required>
              <Input required placeholder="Ej. Vásquez" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
          </div>
          <Field label="Correo" required>
            <Input type="email" required placeholder="docente@uce.edu.ec" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          {!editing && (
            <Field label="Contraseña" required>
              <Input
                type="password"
                required
                placeholder="Contraseña temporal"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </Field>
          )}
        </form>

        {editing && (
          <div className="mt-5 border-t border-border pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Materias asignadas
            </h4>

            {loadingAssign ? (
              <p className="text-sm text-muted-foreground">Cargando materias…</p>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este docente no tiene materias asignadas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignments.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary"
                  >
                    {subjectName(a.subjectId)}
                    <button
                      onClick={() => handleRemoveSubject(a.id)}
                      className="rounded-full p-0.5 hover:bg-primary/20"
                      aria-label="Quitar materia"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <Field label="Agregar materia">
                  <Select value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)}>
                    <option value="">Selecciona una materia…</option>
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button onClick={handleAddSubject} disabled={!newSubjectId} loading={addingSubject}>
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar docente"
        message={`¿Seguro que deseas eliminar a "${toDelete ? `${toDelete.firstName} ${toDelete.lastName}` : ""}"? Esta acción no se puede deshacer.`}
      />
    </Card>
  )
}
