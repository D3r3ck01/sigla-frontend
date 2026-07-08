import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { CrudTab } from "./CrudTab"

export function SubjectsTab() {
  const { data } = useAsync(() => api.get("/academic-programs"), [])
  const programs = asList(data)
  const programName = (id) => programs.find((c) => c.id === id)?.name || "—"

  return (
    <CrudTab
      title="Materias"
      entityLabel="Materia"
      endpoint="/subjects"
      emptyForm={{ name: "", academicProgramId: "", semester: 1 }}
      toForm={(r) => ({
        name: r.name || "",
        academicProgramId: r.academicProgramId || "",
        semester: r.semester ?? 1,
      })}
      toPayload={(f) => ({ ...f, semester: Number(f.semester) || 1 })}
      getName={(r) => r.name}
      fields={[
        { name: "name", label: "Nombre", required: true, placeholder: "Ej. Programación I" },
        {
          name: "academicProgramId",
          label: "Carrera",
          type: "select",
          required: true,
          options: programs.map((c) => ({ value: c.id, label: c.name })),
        },
        {
          name: "semester",
          label: "Semestre",
          type: "number",
          required: true,
          min: 1,
          max: 10,
          placeholder: "1",
        },
      ]}
      columns={[
        { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "semester", header: "Semestre", align: "center", render: (r) => r.semester ?? "—" },
        { key: "program", header: "Carrera", render: (r) => programName(r.academicProgramId) },
      ]}
    />
  )
}
