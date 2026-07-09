import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { Mail, Lock, AlertCircle } from "lucide-react"
import { useAuth, DEMO_CREDENTIALS } from "../../context/AuthContext"
import { Button } from "../../components/Button"
import { Field, Input } from "../../components/Field"

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  function fillDemo() {
    setError("")
    setEmail(DEMO_CREDENTIALS.email)
    setPassword(DEMO_CREDENTIALS.password)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err.message || "No fue posible iniciar sesión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">
            <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
              <rect width="64" height="64" rx="13" fill="#3730A3" />
              <rect x="7" y="10" width="50" height="36" rx="3.5" fill="none" stroke="white" strokeWidth="2.5" opacity=".95" />
              <rect x="13" y="17" width="11" height="7" rx="2" fill="white" opacity=".9" />
              <rect x="27" y="17" width="11" height="7" rx="2" fill="white" opacity=".4" />
              <rect x="41" y="17" width="11" height="7" rx="2" fill="white" opacity=".85" />
              <rect x="13" y="27" width="11" height="7" rx="2" fill="white" opacity=".4" />
              <rect x="27" y="27" width="11" height="7" rx="2" fill="white" />
              <rect x="41" y="27" width="11" height="7" rx="2" fill="white" opacity=".4" />
              <rect x="13" y="37" width="11" height="7" rx="2" fill="white" opacity=".85" />
              <rect x="27" y="37" width="11" height="7" rx="2" fill="white" opacity=".85" />
              <rect x="41" y="37" width="11" height="7" rx="2" fill="white" opacity=".4" />
              <circle cx="32" cy="30" r="2" fill="#34D399" />
              <rect x="29" y="46" width="6" height="6" rx="1" fill="white" opacity=".5" />
              <rect x="22" y="52" width="20" height="3.5" rx="1.5" fill="white" opacity=".5" />
              <circle cx="53" cy="13" r="3" fill="#34D399" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Labora</h1>
          <p className="mt-1 text-sm font-medium text-white/90">Universidad Central del Ecuador</p>
          <p className="mt-1 text-sm text-sidebar-foreground/70">
            Sistema de gestión de laboratorios
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <h2 className="text-lg font-semibold text-card-foreground">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ingresa tus credenciales para continuar.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Correo electrónico" htmlFor="email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-9"
                  placeholder="usuario@uce.edu.ec"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Contraseña" htmlFor="password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Iniciar sesión
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Acceso de demostración
            </p>
            <p className="mt-2 text-sm text-card-foreground">
              Correo: <span className="font-mono">{DEMO_CREDENTIALS.email}</span>
            </p>
            <p className="text-sm text-card-foreground">
              Contraseña: <span className="font-mono">{DEMO_CREDENTIALS.password}</span>
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="mt-3 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Rellenar credenciales de demo
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} Universidad Central del Ecuador — Labora
        </p>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm font-medium text-sidebar-foreground/70 underline-offset-4 hover:text-white hover:underline"
          >
            ← Ver panel público
          </button>
        </div>
      </div>
    </div>
  )
}
