import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCronometro } from '../context/CronometroContext'
import Cronometro from './Cronometro'
import {
  LayoutDashboard, FileText, Users, Target, Award, Upload,
  Settings, ChevronLeft, ChevronRight, Bell, LogOut,
  BarChart3, Database, Timer, ClipboardCheck
} from 'lucide-react'
import clsx from 'clsx'

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink to={to} className={({ isActive }) => clsx('sidebar-item', isActive ? 'sidebar-item-active' : 'sidebar-item-inactive')}>
      <Icon size={18} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const { usuario, logout, isCoordinador, isDirector, isAdmin, canSeeBonus } = useAuth()
  const { sesionActiva, formatearTiempo, segundos } = useCronometro()
  const location = useLocation()

  const pathParts = location.pathname.split('/').filter(Boolean)

  const PAGE_CONFIG = {
    'dashboard': { name: 'Mi productividad', desc: 'Resumen de UPs, Factor K y expedientes del mes seleccionado' },
    'expedientes': { name: 'Expedientes', desc: 'Listado de expedientes aduaneros — búsqueda, filtros y exportación' },
    'equipo': { name: 'Dashboard del equipo', desc: 'Rendimiento global, ranking de operarios y mapa de actividad' },
    'objetivos': { name: 'Objetivos mensuales', desc: 'Configura las UPs objetivo de cada operario para cada mes' },
    'tabla-maestra': { name: 'Tabla maestra de DUAs', desc: 'Tipos de DUA e incrementadores disponibles para los expedientes' },
    'importacion': { name: 'Importación desde Excel', desc: 'Importa expedientes en bloque desde ficheros Excel de Tarictrans' },
    'bonus': { name: 'Bonus y Factor K', desc: 'Parámetros de bonificación y tabla de rendimiento por operario' },
    'mi-evaluacion': { name: 'Mi Evaluación', desc: 'Autoevaluación semestral y resultado del bonus' },
    'evaluaciones-bonus': { name: 'Bonus y Evaluaciones', desc: 'Gestión de evaluaciones semestrales del equipo' },
    'empleados': { name: 'Empleados', desc: 'Gestión de usuarios, roles y accesos al sistema' },
    'informes': { name: 'Informes Excel', desc: 'Descarga informes de productividad, expedientes y bonus' },
    'configuracion': { name: 'Configuración', desc: 'Parámetros generales del sistema GECOTEX' },
  }

  const currentSection = pathParts[0] || 'dashboard'
  const pageConfig = PAGE_CONFIG[currentSection]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={clsx(
        'hidden md:flex flex-col bg-gecotex-navy transition-all duration-300 ease-in-out flex-shrink-0 relative z-20',
        collapsed ? 'w-[68px]' : 'w-[232px]'
      )}>
        {/* Logo */}
        <div className={clsx('pt-6 pb-4 px-5', collapsed ? 'flex justify-center' : '')}>
          {collapsed ? (
            <img src="/assets/gecotex-white.png" alt="G" className="w-9 h-auto object-contain" />
          ) : (
            <div className="flex flex-col gap-1">
              <img src="/assets/gecotex-white.png" alt="Gecotex" className="h-[26px] w-auto object-contain" />
              <span className="text-[8px] font-medium text-white/55 tracking-[.22em] pl-1 uppercase">INTERNACIONAL</span>
            </div>
          )}
        </div>

        <div className="h-px bg-white/10 mx-4 mb-4" />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {!collapsed && <div className="text-[10px] font-semibold text-white/40 tracking-[.18em] px-2.5 pt-2 pb-1.5 uppercase">NAVEGACIÓN</div>}
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Mi productividad" collapsed={collapsed} />
          <NavItem to="/expedientes" icon={FileText} label="Expedientes" collapsed={collapsed} />
          {isCoordinador && (
            <>
              <NavItem to="/equipo" icon={Users} label="Dashboard equipo" collapsed={collapsed} />
              <NavItem to="/objetivos" icon={Target} label="Objetivos" collapsed={collapsed} />
              <NavItem to="/tabla-maestra" icon={Database} label="DUAs y tarifas" collapsed={collapsed} />
              <NavItem to="/importacion" icon={Upload} label="Importar Excel" collapsed={collapsed} />
            </>
          )}
          <NavItem to="/mi-evaluacion" icon={ClipboardCheck} label="Mi Evaluación" collapsed={collapsed} />
          {isDirector && (
            <NavItem to="/evaluaciones-bonus" icon={Award} label="Bonus y Evaluaciones" collapsed={collapsed} />
          )}
          {isAdmin && (
            <NavItem to="/empleados" icon={Users} label="Empleados" collapsed={collapsed} />
          )}
          <NavItem to="/informes" icon={BarChart3} label="Informes" collapsed={collapsed} />
          {isAdmin && (
            <NavItem to="/configuracion" icon={Settings} label="Configuración" collapsed={collapsed} />
          )}
        </nav>

        {/* Cronómetro en sidebar */}
        {sesionActiva && !collapsed && (
          <div className="mx-3 mb-3 p-3.5 bg-gecotex-blue/20 rounded-xl border border-gecotex-blue/30">
            <div className="flex items-center gap-2 mb-1">
              <Timer size={14} className="text-gecotex-blue animate-pulse-slow" />
              <span className="text-white/70 text-[10.5px] font-semibold tracking-wider uppercase">En curso</span>
            </div>
            <p className="text-white font-mono text-xl font-bold">{formatearTiempo(segundos)}</p>
          </div>
        )}

        {/* Usuario */}
        <div className="p-3 border-t border-white/10">
          <div className={clsx('flex items-center gap-3 p-2 rounded-xl transition-colors', !collapsed && 'hover:bg-white/5')}>
            <div className="w-8 h-8 bg-gecotex-blue rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-sm">
              {usuario?.nombre?.[0]}{usuario?.apellidos?.[0]}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-[12.5px] font-semibold truncate leading-tight">{usuario?.nombre} {usuario?.apellidos}</p>
                <p className="text-white/50 text-[11px] capitalize mt-0.5">{usuario?.rol}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={clsx('w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-[12.5px] font-medium', collapsed ? 'justify-center' : '')}
          >
            <LogOut size={16} />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-12 w-6 h-6 bg-white border border-gecotex-border-soft shadow-gx-sm rounded-full flex items-center justify-center text-gecotex-ink hover:text-gecotex-blue transition-colors z-30"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gecotex-border px-8 py-5 flex items-center justify-between flex-shrink-0 z-10">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-gecotex-ink-muted uppercase tracking-widest font-semibold mb-1">
              {pathParts.map((part, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="opacity-40">/</span>}
                  <span className={i === pathParts.length - 1 ? 'text-gecotex-blue' : ''}>
                    {part.replace(/-/g, ' ')}
                  </span>
                </span>
              ))}
            </div>
            <h2 className="text-xl font-bold text-gecotex-ink tracking-tight">
              {pageConfig?.name || pathParts[pathParts.length - 1]?.replace(/-/g, ' ') || 'Inicio'}
            </h2>
            {pageConfig?.desc && (
              <p className="text-[12px] text-gecotex-ink-muted mt-0.5">{pageConfig.desc}</p>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            {sesionActiva && (
              <div className="flex items-center gap-3 bg-gecotex-bg px-4 py-2 rounded-full border border-gecotex-border shadow-sm">
                <div className="w-2 h-2 rounded-full bg-gecotex-green animate-pulse" />
                <span className="text-[13px] font-bold font-mono text-gecotex-navy">{formatearTiempo(segundos)}</span>
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-[12.5px] font-semibold text-gecotex-ink">
                {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-[11px] text-gecotex-ink-muted capitalize">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long' })}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Cronómetro flotante */}
      <Cronometro />
    </div>
  )
}
