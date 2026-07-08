import { api } from "../../lib/api"
import { useAsync, asList } from "../../lib/useAsync"
import { CrudTab } from "./CrudTab"

export function CareersTab() {
  const { data } = useAsync(() => api.get("/faculties"), [])
  const faculties = asList(data)
  const facultyName = (id) => faculties.find((f) => f.id === id)?.name || "—"

  return (
    <CrudTab
      title="Carreras"
      entityLabel="Carrera"
      endpoint="/academic-programs"
      emptyForm={{ name: "", facultyId: "" }}
      toForm={(r) => ({ name: r.name || "", facultyId: r.facultyId || "" })}
      getName={(r) => r.name}
      fields={[
        { name: "name", label: "Nombre", required: true, placeholder: "Ej. Ingeniería en Sistemas" },
        {
          name: "facultyId",
          label: "Facultad",
          type: "select",
          required: true,
          options: faculties.map((f) => ({ value: f.id, label: f.name })),
        },
      ]}
      columns={[
        { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "faculty", header: "Facultad", render: (r) => facultyName(r.facultyId) },
      ]}
    />
  )
}
