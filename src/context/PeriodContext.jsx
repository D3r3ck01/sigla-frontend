import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { api } from "../lib/api"

const PeriodContext = createContext(null)

export function PeriodProvider({ children }) {
  const [periods, setPeriods] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadPeriods = useCallback(async () => {
    setLoading(true)
    try {
      const [data, active] = await Promise.all([
        api.get("/academic-periods"),
        api.get("/academic-periods/active").catch(() => null),
      ])
      const list = Array.isArray(data) ? data : data?.content || []
      setPeriods(list)
      setSelectedId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev
        const activePeriod = active || list.find((p) => p.status === "ACTIVE")
        return activePeriod?.id || list[0]?.id || null
      })
    } catch {
      // Silent — topbar selector will just be empty if it fails.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPeriods()
  }, [loadPeriods])

  const selected = periods.find((p) => p.id === selectedId) || null

  return (
    <PeriodContext.Provider
      value={{ periods, selected, selectedId, setSelectedId, loadPeriods, loading }}
    >
      {children}
    </PeriodContext.Provider>
  )
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error("usePeriod debe usarse dentro de PeriodProvider")
  return ctx
}
