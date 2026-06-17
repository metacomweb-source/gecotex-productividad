import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
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
import MiEvaluacion from './pages/MiEvaluacion'
import EvaluacionesBonus from './pages/EvaluacionesBonus'
import FormularioEvalDir from './pages/FormularioEvalDir'
import Empleados from './pages/Empleados'
import Informes from './pages/Informes'
import Configuracion from './pages/Configuracion'
import ConfigBonus from './pages/ConfigBonus'

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

      <Route path="/dashboard" element={<ProtectedRoute><Layout><ErrorBoundary><DashboardOperario /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/expedientes" element={<ProtectedRoute><Layout><ErrorBoundary><Expedientes /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/expedientes/nuevo" element={<ProtectedRoute><Layout><ErrorBoundary><ExpedienteForm /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/expedientes/:id" element={<ProtectedRoute><Layout><ErrorBoundary><ExpedienteDetalle /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/expedientes/:id/editar" element={<ProtectedRoute><Layout><ErrorBoundary><ExpedienteForm /></ErrorBoundary></Layout></ProtectedRoute>} />

      <Route path="/equipo" element={<ProtectedRoute requiredRole="coordinador"><Layout><ErrorBoundary><DashboardEquipo /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/objetivos" element={<ProtectedRoute requiredRole="coordinador"><Layout><ErrorBoundary><Objetivos /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/tabla-maestra" element={<ProtectedRoute requiredRole="coordinador"><Layout><ErrorBoundary><TablaMaestraDUAs /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/importacion" element={<ProtectedRoute requiredRole="coordinador"><Layout><ErrorBoundary><ImportacionExcel /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/bonus" element={<ProtectedRoute requiredRole="director"><Layout><ErrorBoundary><Bonus /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/mi-evaluacion" element={<ProtectedRoute><Layout><ErrorBoundary><MiEvaluacion /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/evaluaciones-bonus" element={<ProtectedRoute requiredRole="director"><Layout><ErrorBoundary><EvaluacionesBonus /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/evaluaciones-bonus/:id" element={<ProtectedRoute requiredRole="director"><Layout><ErrorBoundary><FormularioEvalDir /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/empleados" element={<ProtectedRoute requiredRole="admin"><Layout><ErrorBoundary><Empleados /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/informes" element={<ProtectedRoute><Layout><ErrorBoundary><Informes /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/configuracion" element={<ProtectedRoute requiredRole="admin"><Layout><ErrorBoundary><Configuracion /></ErrorBoundary></Layout></ProtectedRoute>} />
      <Route path="/config-bonus" element={<ProtectedRoute requiredRole="admin"><Layout><ErrorBoundary><ConfigBonus /></ErrorBoundary></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
