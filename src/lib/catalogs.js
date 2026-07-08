import { useCallback } from "react"
import { api } from "./api"
import { useAsync, asList } from "./useAsync"

/** Loads subjects, teachers (users with role TEACHER) and laboratories used across scheduling & sessions forms. */
export function useCatalogs() {
  const load = useCallback(async () => {
    const [subjects, users, labs] = await Promise.all([
      api.get("/subjects").catch(() => []),
      api.get("/users?role=TEACHER").catch(() => []),
      api.get("/laboratories").catch(() => []),
    ])
    return {
      subjects: asList(subjects),
      teachers: asList(users).filter((u) => u.role === "TEACHER"),
      laboratories: asList(labs),
    }
  }, [])

  const { data, loading } = useAsync(load, [])

  const subjects = data?.subjects || []
  const teachers = data?.teachers || []
  const laboratories = data?.laboratories || []

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || id || "—"
  const teacherName = (id) => {
    const t = teachers.find((u) => u.id === id)
    return t ? `${t.firstName} ${t.lastName}`.trim() : id || "—"
  }
  const labName = (id) => laboratories.find((l) => l.id === id)?.name || id || "—"
  const labCode = (id) => laboratories.find((l) => l.id === id)?.code || ""

  return { subjects, teachers, laboratories, subjectName, teacherName, labName, labCode, loading }
}

export const DAYS = [
  { value: "MONDAY", label: "Lunes", num: 1 },
  { value: "TUESDAY", label: "Martes", num: 2 },
  { value: "WEDNESDAY", label: "Miércoles", num: 3 },
  { value: "THURSDAY", label: "Jueves", num: 4 },
  { value: "FRIDAY", label: "Viernes", num: 5 },
  { value: "SATURDAY", label: "Sábado", num: 6 },
]

/** Normalizes a weekDay value (string or number) to one of the DAYS entries. */
export function resolveDay(value) {
  if (value == null) return null
  const str = String(value).toUpperCase()
  return (
    DAYS.find((d) => d.value === str) ||
    DAYS.find((d) => String(d.num) === str) ||
    DAYS.find((d) => d.label.toUpperCase() === str) ||
    null
  )
}
