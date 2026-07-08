import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  GraduationCap,
  FlaskConical,
  CalendarDays,
  ClipboardList,
  LogOut,
  FlaskRound,
  Monitor,
  AlertTriangle,
} from "lucide-react"
import { cn } from "../lib/utils"
import { api } from "../lib/api"
import { asList } from "../lib/useAsync"
import { useAuth } from "../context/AuthContext"

const NAV = [
  { to: "/dashboard", label: "Panel de control", icon: LayoutDashboard },
  { to: "/academic", label: "Académico", icon: GraduationCap },
  { to: "/laboratories", label: "Laboratorios", icon: FlaskConical },
  { to: "/admin/inventory", label: "Inventario", icon: Monitor },
  { to: "/admin/incidents", label: "Incidencias", icon: AlertTriangle, badge: "incidents" },
  { to: "/scheduling/base-schedules", label: "Horarios", icon: CalendarDays },
  { to: "/sessions", label: "Sesiones", icon: ClipboardList },
]

const INCIDENT_REFRESH_MS = 60000

export function Sidebar({ open, onNavigate }) {
  const { logout } = useAuth()
  const [incidentCount, setIncidentCount] = useState(0)

  useEffect(() => {
    let active = true
    async function loadCount() {
      try {
        // Fetch all incidents and count active ones (OPEN + IN_PROGRESS) client-side.
        const all = await api.get("/incidents").catch(() => [])
        const activeCount = asList(all).filter(
          (i) => i.status === "OPEN" || i.status === "IN_PROGRESS",
        ).length
        if (active) setIncidentCount(activeCount)
      } catch {
        /* keep last known count */
      }
    }
    loadCount()
    const interval = setInterval(loadCount, INCIDENT_REFRESH_MS)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={onNavigate}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskRound className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">SIGLA UCE</p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              Universidad Central del Ecuador
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-white/80 w-1" />
                    )}
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge === "incidents" && incidentCount > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-danger-foreground">
                        {incidentCount > 99 ? "99+" : incidentCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-danger/20 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
