import { useCallback, useMemo, useState } from "react"
import { Plus, ChevronDown, Play, Check } from "lucide-react"
import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { useToast } from "../../context/ToastContext"
import { useCatalogs } from "../../lib/catalogs"
import { PageHeader } from "../../components/PageHeader"
import { Card, CardBody } from "../../components/Card"
import { Button } from "../../components/Button"
import { Field, Select, Textarea } from "../../components/Field"
import { IncidentFormModal } from "./IncidentFormModal"
import { priorityMeta, severityMeta, INCIDENT_STATUS_LABEL, relativeTime } from "../../lib/labUi"

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Abierta" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "RESOLVED", label: "Resuelta" },
  { value: "CLOSED", label: "Cerrada" },
]

const PRIORITY_OPTIONS = [
  { value: "CRITICAL", label: "Crítica" },
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
]

function PriorityBadge({ priority }) {
  const pm = priorityMeta(priority)
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
      style={{ backgroundColor: pm.bg, color: pm.fg }}
    >
      {pm.label}
    </span>
  )
}

function SeverityBadge({ severity }) {
  const sm = severityMeta(severity)
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
      style={{ backgroundColor: sm.bg, color: sm.fg }}
    >
      {sm.label}
    </span>
  )
}

function StatusChip({ status }) {
  const tone = {
    OPEN: { bg: "#FEE2E2", fg: "#B91C1C" },
    IN_PROGRESS: { bg: "#FEF3C7", fg: "#B45309" },
    RESOLVED: { bg: "#DCFCE7", fg: "#15803D" },
    CLOSED: { bg: "#F3F4F6", fg: "#4B5563" },
  }[status] || { bg: "#F3F4F6", fg: "#4B5563" }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {INCIDENT_STATUS_LABEL[status] || status}
    </span>
  )
}

function IncidentRow({ incident, labName, typeName, onChanged }) {
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [solutionText, setSolutionText] = useState(incident.solution || "")
  const [statusDraft, setStatusDraft] = useState(incident.status)
  const [busy, setBusy] = useState(false)

  async function patchStatus(status, solution) {
    setBusy(true)
    try {
      const body = { status }
      if (solution !== undefined) body.solution = solution
      await api.patch(`/incidents/${incident.id}/status`, body)
      toast.success("Estado actualizado.")
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveStatusDraft() {
    if (statusDraft === incident.status && solutionText === (incident.solution || "")) return
    await patchStatus(statusDraft, solutionText.trim() || null)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={incident.priority} />
            <SeverityBadge severity={incident.severity} />
            <span className="text-sm font-semibold text-foreground">
              {incident.code} &mdash; {labName}
            </span>
          </div>
          <p className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{typeName}</span>
            <span>·</span>
            <span>{relativeTime(incident.createdAt)}</span>
          </p>
          <p className="text-sm text-foreground">{incident.description}</p>
          {incident.solution && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Solución:</span> {incident.solution}
            </p>
          )}
          <div className="mt-2">
            <StatusChip status={incident.status} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {incident.status === "OPEN" && (
            <Button size="sm" variant="secondary" loading={busy} onClick={() => patchStatus("IN_PROGRESS")}>
              <Play className="h-3.5 w-3.5" />
              Iniciar
            </Button>
          )}
          {(incident.status === "OPEN" || incident.status === "IN_PROGRESS") && (
            <Button
              size="sm"
              variant="success"
              loading={busy}
              onClick={() => patchStatus("RESOLVED", solutionText.trim() || null)}
            >
              <Check className="h-3.5 w-3.5" />
              Resolver
            </Button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            Detalles
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-border bg-muted/30 p-4">
          {/* Solution note */}
          <div>
            <Field label="Solución / nota de resolución">
              <Textarea
                rows={2}
                placeholder="Describe la solución aplicada…"
                value={solutionText}
                onChange={(e) => setSolutionText(e.target.value)}
              />
            </Field>
          </div>

          {/* Status update */}
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <Field label="Cambiar estado">
                <Select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              variant="secondary"
              loading={busy}
              disabled={statusDraft === incident.status && solutionText === (incident.solution || "")}
              onClick={saveStatusDraft}
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function IncidentsPage() {
  const [labId, setLabId] = useState("")
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const [typeId, setTypeId] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const catalogs = useCatalogs()

  const { data: labsData } = useAsync(() => api.get("/laboratories"), [])
  const labs = asList(labsData)
  const labName = useCallback(
    (id) => {
      const l = labs.find((x) => String(x.id) === String(id))
      return l ? l.name : "Laboratorio"
    },
    [labs],
  )

  const loadIncidents = useCallback(() => api.get("/incidents"), [])
  const { data, loading, refetch } = useAsync(loadIncidents, [])
  const incidents = asList(data)

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (labId && String(i.laboratoryId) !== String(labId)) return false
      if (status && i.status !== status) return false
      if (priority && i.priority !== priority) return false
      if (typeId && String(i.typeId) !== String(typeId)) return false
      return true
    })
  }, [incidents, labId, status, priority, typeId])

  return (
    <div>
      <PageHeader
        title="Incidencias"
        description="Gestiona las incidencias y solicitudes de los laboratorios."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva incidencia
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4">
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Laboratorio">
            <Select value={labId} onChange={(e) => setLabId(e.target.value)}>
              <option value="">Todos</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Todas</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">Todos</option>
              {catalogs.incidentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-muted-foreground">
            No hay incidencias que coincidan con los filtros.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => (
            <IncidentRow
              key={inc.id}
              incident={inc}
              labName={labName(inc.laboratoryId)}
              typeName={catalogs.incidentTypeName(inc.typeId)}
              onChanged={refetch}
            />
          ))}
        </div>
      )}

      <IncidentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
        labs={labs}
      />
    </div>
  )
}
