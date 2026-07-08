import { useEffect, useMemo, useState } from "react"
import { Monitor, Package, AlertTriangle } from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { PageHeader } from "../../components/PageHeader"
import { Card, CardHeader, CardBody } from "../../components/Card"
import { Button } from "../../components/Button"
import { Badge } from "../../components/Badge"
import { Field, Select } from "../../components/Field"
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
  const [eqStatus, setEqStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const [incidentInitial, setIncidentInitial] = useState(null)

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

  // Fetch installed software for the equipment of the workstation being viewed.
  useEffect(() => {
    const eq = detail ? equipment.find((e) => String(e.workstationId) === String(detail.id)) : null
    if (!eq) {
      setDetailSoftware([])
      return
    }
    let active = true
    api
      .get(`/equipment/${eq.id}/installed-software`)
      .then((d) => active && setDetailSoftware(asList(d)))
      .catch(() => active && setDetailSoftware([]))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail])

  const equipmentByWs = useMemo(() => {
    const map = new Map()
    for (const eq of equipment) {
      if (eq.workstationId) map.set(String(eq.workstationId), { ...eq, categoryName: equipCategoryName(eq.categoryId) })
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment, equipCategories])

  const devices = useMemo(() => equipment.filter((e) => e.workstationId == null), [equipment])

  // Workstations with their equipment attached (for the grid tooltips).
  const wsWithEquipment = useMemo(
    () => workstations.map((w) => ({ ...w, equipment: equipmentByWs.get(String(w.id)) || null })),
    [workstations, equipmentByWs],
  )

  function openEdit(ws) {
    setEditing(ws)
    setWsStatus(ws.status)
    const eq = equipmentByWs.get(String(ws.id))
    setEqStatus(eq ? eq.status : "")
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
      const eq = equipmentByWs.get(String(editing.id))
      if (eq && eqStatus && eqStatus !== eq.status) {
        await api.patch(`/equipment/${eq.id}/status`, { status: eqStatus })
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

  function reportFromEdit() {
    const eq = editing ? equipmentByWs.get(String(editing.id)) : null
    setIncidentInitial({
      laboratoryId: labId,
      workstationId: editing?.id || "",
      equipmentId: eq?.id || "",
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
      header: "Equipo asignado",
      render: (r) => {
        const eq = equipmentByWs.get(String(r.id))
        return eq ? (
          <span className="text-sm text-foreground">
            <span className="font-mono text-xs">{eq.code}</span> · {eq.name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Sin equipo</span>
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

  const editingEquipment = editing ? equipmentByWs.get(String(editing.id)) : null
  const detailEquipment = detail ? equipmentByWs.get(String(detail.id)) : null

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
            {detailEquipment ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{detailEquipment.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{detailEquipment.code}</p>
                  </div>
                  <Badge tone="neutral">
                    {EQUIPMENT_STATUS_LABEL[detailEquipment.status] || detailEquipment.status}
                  </Badge>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">{equipCategoryName(detailEquipment.categoryId)}</span>
                  </div>
                </dl>
                {detailSoftware.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
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
              <p className="text-sm text-muted-foreground">Esta estación no tiene equipo asignado.</p>
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
            {editingEquipment && (
              <Field label={`Estado del equipo (${editingEquipment.code} · ${editingEquipment.name})`}>
                <Select value={eqStatus} onChange={(e) => setEqStatus(e.target.value)}>
                  {EQUIP_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </form>
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
