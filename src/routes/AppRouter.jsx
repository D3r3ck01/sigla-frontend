import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "./ProtectedRoute"
import { AppLayout } from "../components/AppLayout"
import { LoginPage } from "../pages/auth/LoginPage"
import { DashboardPage } from "../pages/dashboard/DashboardPage"
import { AcademicPage } from "../pages/academic/AcademicPage"
import { LaboratoriesPage } from "../pages/laboratories/LaboratoriesPage"
import { BaseSchedulesPage } from "../pages/scheduling/BaseSchedulesPage"
import { SessionsPage } from "../pages/sessions/SessionsPage"
import { PublicStatusPage } from "../pages/public/PublicStatusPage"

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicStatusPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/academic" element={<AcademicPage />} />
          <Route path="/laboratories" element={<LaboratoriesPage />} />
          <Route path="/scheduling/base-schedules" element={<BaseSchedulesPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
