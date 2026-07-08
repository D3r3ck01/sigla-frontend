import { Menu, Bell, ChevronDown, LogOut } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { usePeriod } from "../context/PeriodContext"
import { Select } from "./Field"

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { periods, selectedId, setSelectedId } = usePeriod()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  // Be resilient to different backend user shapes (name/lastname, nombre/apellido, email).
  const firstName = user?.name || user?.nombre || ""
  const lastName = user?.lastname || user?.apellido || ""
  const displayName =
    `${firstName} ${lastName}`.trim() || user?.fullName || user?.nombreCompleto || user?.email || "Usuario"
  const role = user?.role || user?.rol || ""
  const initials =
    (`${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() ||
      (displayName[0] || "").toUpperCase() ||
      "U")

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Periodo:</span>
        <Select
          value={selectedId || ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="h-9 w-44 text-sm"
          aria-label="Periodo académico"
        >
          {periods.length === 0 && <option value="">Sin periodos</option>}
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.status === "ACTIVE" ? "(Activo)" : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-foreground">
                {displayName}
              </span>
              <span className="block text-[11px] leading-tight text-muted-foreground">
                {role}
              </span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
