import { useEffect, useMemo, useState } from "react"
import { Monitor, Package, AlertTriangle, Plus, X } from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { PageHeader } from "../../components/PageHeader"
import { Card, CardHeader, CardBody } from "../../components/Card"
import { Button } from "../../components/Button"
import { Badge } from "../../components/Badge"
import { Field, Select, Input } from "../../components/Field"
import { DataTable } from "../../components/DataTable"
import { Modal } from "../../components/Modal"
import { WorkstationGrid, WorkstationLegend } from "../../components/WorkstationGrid"
import { IncidentFormModal } from "../incidents/IncidentFormModal"
import { wsStatusMeta, EQUIPMENT_STATUS_LABEL, hasEquipment } from "../../lib/labUi"

const WS_STATUSES = [
  { value: "ACTIVE", label: "Activa" },
  { value: "UNDER_MAINTENANCE", label: "En mantenimiento" },
  { value: "INACTIVE", label: "Inactiva" },
]

const EQUIP_STATUSES = [
  { value: "ACTIVE", label: "Activo" },
  { value: "UNDER_MAINTENANCE", label: "En mantenimiento" },
  { value: "DAMAGED", label: "Dañado" },
  { value: "INACTIVE", label: "Inactivo" },
]

function WsStatusBadge({ status }) {
  const meta = wsStatusMeta(status)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: meta.bg, color: meta.dot }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

export function InventoryPage() {
  const toast = useToast()
  const { data: labsData, loading: labsLoading } = useAsync(() => api.get("/laboratories"), [])
  const labs = asList(labsData)

  const { data: labCatsData } = useAsync(() => api.get("/laboratory-categories"), [])
  const labCategories = asList(labCatsData)
  const categoryName = (id) => labCategories.find((c) => c.id === id)?.name || "—"

  const { data: equipCatsData } = useAsync(() => api.get("/equipment-categories"), [])
  const equipCategories = asList(equipCatsData)
  const equipCategoryName = (id) => equipCategories.find((c) => c.id === id)?.name || "—"

  const [labId, setLabId] = useState("")
  const [workstations, setWorkstations] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(false)

  const [detail, setDetail] = useState(null) // workstation being viewed
  const [detailSoftware, setDetailSoftware] = useState([])
  const [editing, setEditing] = useState(null) // workstation being edited
  const [wsStatus, setWsStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const [incidentInitial, setIncidentInitial] = useState(null)

  // New-equipment form state (inside the edit modal).
  const [newEqName, setNewEqName] = useState("")
  const [newEqCategory, setNewEqCategory] = useState("")
  const [newEqCustomCategory, setNewEqCustomCategory] = useState("")
  const [newEqStatus, setNewEqStatus] = useState("ACTIVE")
  const [addingEq, setAddingEq] = useState(false)
  const [busyEqId, setBusyEqId] = useState(null)

  const selectedLab = labs.find((l) => String(l.id) === String(labId))

  // Default to the first lab that actually has workstations once labs load.
  useEffect(() => {
    if (labId || !labs.length) return
    const firstEquipped = labs.find((l) => hasEquipment(categoryName(l.categoryId))) || labs[0]
    if (firstEquipped) setLabId(firstEquipped.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labs, labCategories])

  async function loadInventory(id) {
    if (!id) {
      setWorkstations([])
      setEquipment([])
      return
    }
    setLoading(true)
    try {
      const [ws, eq] = await Promise.all([
        api.get(`/laboratories/${id}/workstations`).catch(() => []),
        api.get(`/laboratories/${id}/equipment`).catch(() => []),
      ])
      setWorkstations(asList(ws))
      setEquipment(asList(eq))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory(labId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId])

  // Fetch installed software for the primary computer of the workstation being viewed.
  useEffect(() => {
    const wsEquip = detail ? equipment.filter((e) => String(e.workstationId) === String(detail.id)) : []
    const primary =
      wsEquip.find((e) => equipCategories.find((c) => c.id === e.categoryId)?.type === "COMPUTER") || wsEquip[0]
    if (!primary) {
      setDetailSoftware([])
      return
    }
    let active = true
    api
      .get(`/equipment/${primary.id}/installed-software`)
      .then((d) => active && setDetailSoftware(asList(d)))
      .catch(() => active && setDetailSoftware([]))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail])

  // Map<workstationId, equipment[]> — a workstation can hold multiple items.
  const equipmentByWs = useMemo(() => {
    const map = new Map()
    for (const eq of equipment) {
      if (!eq.workstationId) continue
      const key = String(eq.workstationId)
      const resolvedCat = eq.categoryId ? equipCategoryName(eq.categoryId) : eq.categoryName || "—"
      const item = { ...eq, categoryName: resolvedCat }
      const arr = map.get(key)
      if (arr) arr.push(item)
      else map.set(key, [item])
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment, equipCategories])

  const devices = useMemo(() => equipment.filter((e) => e.workstationId == null), [equipment])

  // Workstations with their equipment attached (for the grid tooltips).
  const wsWithEquipment = useMemo(
    () => workstations.map((w) => ({ ...w, equipment: equipmentByWs.get(String(w.id)) || [] })),
    [workstations, equipmentByWs],
  )

  function resetNewEqForm() {
    setNewEqName("")
    setNewEqCategory("")
    setNewEqCustomCategory("")
    setNewEqStatus("ACTIVE")
  }

  function openEdit(ws) {
    setEditing(ws)
    setWsStatus(ws.status)
    resetNewEqForm()
    setDetail(null)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      if (wsStatus !== editing.status) {
        await api.patch(`/workstations/${editing.id}/status`, { status: wsStatus })
      }
      toast.success("Estado actualizado correctamente.")
      setEditing(null)
      await loadInventory(labId)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddEquipment() {
    if (!editing || !newEqName.trim()) return
    setAddingEq(true)
    try {
      // "Other…" lets the operator type a free-text category; otherwise use the selected id.
      const categoryId = newEqCategory === "__other__" ? null : newEqCategory || null
      await api.post("/equipment", {
        name: newEqName.trim(),
        categoryId,
        categoryName: newEqCategory === "__other__" ? newEqCustomCategory.trim() : undefined,
        workstationId: editing.id,
        status: newEqStatus,
      })
      toast.success("Equipo agregado correctamente.")
      resetNewEqForm()
      await loadInventory(labId)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingEq(false)
    }
  }

  async function handleChangeEquipmentStatus(eq, status) {
    setBusyEqId(eq.id)
    try {
      await api.patch(`/equipment/${eq.id}/status`, { status })
      await loadInventory(labId)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyEqId(null)
    }
  }

  async function handleDeleteEquipment(eq) {
    setBusyEqId(eq.id)
    try {
      await api.del(`/equipment/${eq.id}`)
      toast.success("Equipo eliminado correctamente.")
      await loadInventory(labId)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyEqId(null)
    }
  }

  function reportFromEdit() {
    const list = editing ? equipmentByWs.get(String(editing.id)) : null
    setIncidentInitial({
      laboratoryId: labId,
      workstationId: editing?.id || "",
      equipmentId: list?.[0]?.id || "",
    })
    setEditing(null)
  }

  const columns = [
    {
      key: "code",
      header: "Estación",
      render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
    },
    { key: "rowNumber", header: "Fila", align: "center", render: (r) => r.rowNumber },
    { key: "columnNumber", header: "Columna", align: "center", render: (r) => r.columnNumber },
    { key: "status", header: "Estado", render: (r) => <WsStatusBadge status={r.status} /> },
    {
      key: "equipment",
      header: "Equipos asignados",
      render: (r) => {
        const list = equipmentByWs.get(String(r.id)) || []
        return list.length ? (
          <span className="text-sm text-foreground">
            {list.map((e) => e.name).join(", ")}{" "}
            <span className="text-xs text-muted-foreground">({list.length})</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Sin equipos</span>
        )
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>
          Editar estado
        </Button>
      ),
    },
  ]

  const editingEquipment = (editing ? equipmentByWs.get(String(editing.id)) : null) || []
  const detailEquipment = (detail ? equipmentByWs.get(String(detail.id)) : null) || []
  const otherSelected = newEqCategory === "__other__"
  const canAddEquipment = Boolean(newEqName.trim()) && (!otherSelected || Boolean(newEqCustomCategory.trim()))

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Gestiona las estaciones de trabajo y los equipos de cada laboratorio."
      />

      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-96">
            <Field label="Laboratorio">
              <Select
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                disabled={labsLoading}
                aria-label="Seleccionar laboratorio"
              >
                <option value="">Selecciona un laboratorio…</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {selectedLab && (
            <Button
              variant="secondary"
              className="sm:ml-auto"
              onClick={() => {
                setIncidentInitial({ laboratoryId: labId, workstationId: "", equipmentId: "" })
              }}
            >
              <AlertTriangle className="h-4 w-4" />
              Reportar incidencia
            </Button>
          )}
        </CardBody>
      </Card>

      {!labId ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-muted-foreground">
            Selecciona un laboratorio para ver su inventario.
          </CardBody>
        </Card>
      ) : workstations.length === 0 && !loading ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Monitor className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">Este laboratorio no tiene estaciones registradas.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Visual grid */}
          <Card>
            <CardHeader
              title="Mapa de estaciones"
              subtitle={selectedLab ? `${selectedLab.code} · ${workstations.length} estaciones` : ""}
            />
            <CardBody className="space-y-4">
              {loading ? (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="h-7 w-7 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              ) : (
                <>
                  <WorkstationGrid workstations={wsWithEquipment} onSelect={(ws) => setDetail(ws)} />
                  <WorkstationLegend />
                  {devices.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="mb-1.5 text-xs font-semibold text-foreground">Equipos de red / otros</p>
                      <ul className="space-y-1.5">
                        {devices.map((d) => (
                          <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono text-xs text-foreground">{d.code}</span>
                            <span className="font-medium text-foreground">{d.name}</span>
                            <span>· {equipCategoryName(d.categoryId)}</span>
                            <span>· {EQUIPMENT_STATUS_LABEL[d.status] || d.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader title="Estaciones de trabajo" />
            <CardBody className="p-0">
              <DataTable
                columns={columns}
                data={wsWithEquipment}
                loading={loading}
                emptyMessage="No hay estaciones registradas."
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Workstation detail modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `Estación ${detail.code}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Cerrar
            </Button>
            {detail && (
              <Button onClick={() => openEdit(detail)}>Editar estado</Button>
            )}
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Estado de la estación</span>
              <div className="mt-1">
                <WsStatusBadge status={detail.status} />
              </div>
            </div>
            {detailEquipment.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Equipos asignados ({detailEquipment.length})
                </p>
                {detailEquipment.map((eq) => (
                  <div key={eq.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{eq.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{eq.code}</p>
                      </div>
                      <Badge tone="neutral">{EQUIPMENT_STATUS_LABEL[eq.status] || eq.status}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-muted-foreground">{eq.categoryName}</span>
                    </div>
                  </div>
                ))}
                {detailSoftware.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Software instalado</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailSoftware.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-md bg-card px-2 py-0.5 text-xs text-foreground shadow-sm"
                        >
                          {s.name} {s.version}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Esta estación no tiene equipos asignados.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Edit status modal */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Editar estación ${editing.code}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={reportFromEdit} disabled={saving}>
              <AlertTriangle className="h-4 w-4" />
              Reportar incidencia
            </Button>
            <Button type="submit" form="ws-edit-form" loading={saving}>
              Guardar cambios
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <form id="ws-edit-form" onSubmit={handleSaveEdit} className="space-y-4">
              <Field label="Estado de la estación" required>
                <Select value={wsStatus} onChange={(e) => setWsStatus(e.target.value)}>
                  {WS_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </form>

            <div className="mt-5 border-t border-border pt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Equipos asignados
              </h4>

              {editingEquipment.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta estación no tiene equipos asignados.</p>
              ) : (
                <ul className="space-y-2">
                  {editingEquipment.map((eq) => (
                    <li
                      key={eq.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{eq.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{eq.code}</span> · {eq.categoryName}
                        </p>
                      </div>
                      <Select
                        value={eq.status}
                        disabled={busyEqId === eq.id}
                        onChange={(e) => handleChangeEquipmentStatus(eq, e.target.value)}
                        className="w-40"
                        aria-label={`Estado de ${eq.name}`}
                      >
                        {EQUIP_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => handleDeleteEquipment(eq)}
                        disabled={busyEqId === eq.id}
                        className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                        aria-label={`Eliminar ${eq.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 space-y-3 rounded-lg border border-dashed border-border p-3">
                <p className="text-xs font-semibold text-foreground">Agregar equipo</p>
                <Field label="Nombre del equipo" required>
                  <Input
                    placeholder='Ej. Teclado HP, Mouse Logitech, Monitor Dell 22"'
                    value={newEqName}
                    onChange={(e) => setNewEqName(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Categoría">
                    <Select value={newEqCategory} onChange={(e) => setNewEqCategory(e.target.value)}>
                      <option value="">Sin categoría…</option>
                      {equipCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__other__">Otra…</option>
                    </Select>
                  </Field>
                  <Field label="Estado inicial">
                    <Select value={newEqStatus} onChange={(e) => setNewEqStatus(e.target.value)}>
                      {EQUIP_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                {otherSelected && (
                  <Field label="Nueva categoría" required>
                    <Input
                      placeholder="Ej. Lector de tarjetas"
                      value={newEqCustomCategory}
                      onChange={(e) => setNewEqCustomCategory(e.target.value)}
                    />
                  </Field>
                )}
                <div className="flex justify-end">
                  <Button onClick={handleAddEquipment} disabled={!canAddEquipment} loading={addingEq}>
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Report incident (prefilled from inventory) */}
      <IncidentFormModal
        open={Boolean(incidentInitial)}
        onClose={() => setIncidentInitial(null)}
        onCreated={() => loadInventory(labId)}
        labs={labs}
        initial={incidentInitial || {}}
      />
    </div>
  )
}
