import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import DashboardOperario from './pages/DashboardOperario'
import DashboardEquipo from './pages/DashboardEquipo'
import Expedientes from './pages/Expedientes'
import ExpedienteDetalle from './pages/ExpedienteDetalle'
import ExpedienteForm from './pages/ExpedienteForm'
import ImportacionExcel from './pages/ImportacionExcel'
import TablaMaestraDUAs from './pages/TablaMaestraDUAs'
import Objetivos from './pages/Objetivos'
import Bonus from './pages/Bonus'
import Empleados from './pages/Empleados'
import Informes from './pages/Informes'
import Configuracion from './pages/Configuracion'

function ProtectedRoute({ children, requiredRole }) {
  const { usuario, loading, isCoordinador, isDirector, isAdmin } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gecotex-primary" /></div>
  if (!usuario) return <Navigate to="/login" replace />
  if (requiredRole === 'coordinador' && !isCoordinador) return <Navigate to="/dashboard" replace />
  if (requiredRole === 'director' && !isDirector) return <Navigate to="/dashboard" replace />
  if (requiredRole === 'admin' && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function DefaultRedirect() {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  const { usuario, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gecotex-primary" /></div>

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<DefaultRedirect />} />

      <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardOperario /></Layout></ProtectedRoute>} />
      <Route path="/expedientes" element={<ProtectedRoute><Layout><Expedientes /></Layout></ProtectedRoute>} />
      <Route path="/expedientes/nuevo" element={<ProtectedRoute><Layout><ExpedienteForm /></Layout></ProtectedRoute>} />
      <Route path="/expedientes/:id" element={<ProtectedRoute><Layout><ExpedienteDetalle /></Layout></ProtectedRoute>} />
      <Route path="/expedientes/:id/editar" element={<ProtectedRoute><Layout><ExpedienteForm /></Layout></ProtectedRoute>} />

      <Route path="/equipo" element={<ProtectedRoute requiredRole="coordinador"><Layout><DashboardEquipo /></Layout></ProtectedRoute>} />
      <Route path="/objetivos" element={<ProtectedRoute requiredRole="coordinador"><Layout><Objetivos /></Layout></ProtectedRoute>} />
      <Route path="/tabla-maestra" element={<ProtectedRoute requiredRole="coordinador"><Layout><TablaMaestraDUAs /></Layout></ProtectedRoute>} />
      <Route path="/importacion" element={<ProtectedRoute requiredRole="coordinador"><Layout><ImportacionExcel /></Layout></ProtectedRoute>} />
      <Route path="/bonus" element={<ProtectedRoute requiredRole="director"><Layout><Bonus /></Layout></ProtectedRoute>} />
      <Route path="/empleados" element={<ProtectedRoute requiredRole="admin"><Layout><Empleados /></Layout></ProtectedRoute>} />
      <Route path="/informes" element={<ProtectedRoute><Layout><Informes /></Layout></ProtectedRoute>} />
      <Route path="/configuracion" element={<ProtectedRoute requiredRole="admin"><Layout><Configuracion /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
