import { CrudTab } from "./CrudTab"

export function FacultiesTab() {
  return (
    <CrudTab
      title="Facultades"
      entityLabel="Facultad"
      endpoint="/faculties"
      emptyForm={{ name: "" }}
      toForm={(r) => ({ name: r.name || "" })}
      getName={(r) => r.name}
      fields={[{ name: "name", label: "Nombre", required: true, placeholder: "Ej. Ingeniería" }]}
      columns={[{ key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> }]}
    />
  )
}
