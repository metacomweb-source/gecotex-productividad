import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCronometro } from '../context/CronometroContext'
import { kpisApi, expedientesApi, bonusApi } from '../api/client'
import KpiCard from '../components/KpiCard'
import Semaforo from '../components/Semaforo'
import TarjetaHoy from '../components/TarjetaHoy'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { FileText, Plus, Sparkles, Award, Package, Clock, Pause, StopCircle, Search, Filter, ChevronRight, Timer, ChevronDown, ClipboardCheck } from 'lucide-react'
import { fmtUP, fmtK, fmtPct, fmtFechaHora, nombreMes } from '../utils/formatters'
import clsx from 'clsx'
import { useCelebraciones } from '../hooks/useCelebraciones'

function textoKpi(tipo, valor) {
  if (tipo === 'factor_k') {
    if (valor == null) return null
    if (valor < 0.70) return 'Estás por debajo de tu objetivo mensual.'
    if (valor < 0.85) return 'Vas encaminado/a, aún tienes margen para mejorar.'
    if (valor < 1.00) return 'Casi en el objetivo. Buen ritmo.'
    return '¡Superando el objetivo mensual!'
  }
  if (tipo === 'ups') {
    if (valor == null) return null
    const duasEq = Math.round(valor / 1.0)
    return `Equivale a ~${duasEq} DUAs de exportación básica`
  }
  if (tipo === 'ocupacion') {
    if (valor == null) return null
    if (valor < 70) return 'Capacidad disponible. Puedes asumir más carga.'
    if (valor < 90) return 'Ritmo de trabajo equilibrado.'
    if (valor <= 110) return 'Carga alta pero dentro del límite saludable.'
    return 'Estás sobrecargado/a. Habla con tu coordinador/a.'
  }
  return null
}

export default function DashboardOperario() {
  const { usuario } = useAuth()
  const { sesionActiva, segundos, formatearTiempo, finalizar, pausar } = useCronometro()
  const { celebrar } = useCelebraciones()
  const navigate = useNavigate()
  const now = new Date()
  const [año, setAño] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [kpis, setKpis] = useState(null)
  const [expedientes, setExpedientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [miEval, setMiEval] = useState(null)
  const [celebradoMes, setCelebradoMes] = useState(false)

  useEffect(() => {
    if (!usuario) return
    setLoading(true)
    Promise.all([
      kpisApi.operario(usuario.id, { año, mes }),
      expedientesApi.listar({ operario_id: usuario.id, año, mes, limit: 200 }),
    ])
      .then(([kpisRes, expsRes]) => {
        setKpis(kpisRes.data)
        setExpedientes(expsRes.data)
        const k = kpisRes.data?.factor_k
        const isCurrentMonth = año === now.getFullYear() && mes === (now.getMonth() + 1)
        if (k >= 1.0 && isCurrentMonth && !celebradoMes) {
          setCelebradoMes(true)
          celebrar('objetivo_mes')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    bonusApi.miEvaluacion().then(r => setMiEval(r.data)).catch(() => setMiEval(null))
  }, [usuario, año, mes])

  const chartData = (() => {
    const byDay = {}
    expedientes.forEach(e => {
      const dia = e.fecha_apertura_dossier ? new Date(e.fecha_apertura_dossier).getDate() : new Date(e.created_at).getDate()
      byDay[dia] = (byDay[dia] || 0) + (e.up_calculadas || 0)
    })
    return Array.from({ length: 31 }, (_, i) => ({
      dia: i + 1,
      up: +(byDay[i + 1] || 0).toFixed(2)
    }))
  })()

  if (loading) return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="h-8 w-64 bg-gecotex-border-soft rounded animate-pulse" />
        <div className="h-10 w-32 bg-gecotex-border-soft rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-36 bg-white rounded-xl shadow-sm border border-gecotex-border-soft animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-white rounded-xl shadow-sm border border-gecotex-border-soft animate-pulse" />
        <div className="h-64 bg-white rounded-xl shadow-sm border border-gecotex-border-soft animate-pulse" />
      </div>
    </div>
  )

  const isAhead = (kpis?.factor_k || 0) >= 1.0

  const saludo = (() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 14) return 'Buenos días'
    if (h >= 14 && h < 21) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Tarjeta Hoy */}
      <TarjetaHoy usuarioId={usuario?.id} nombreUsuario={usuario?.nombre} />

      {/* Welcome + Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gecotex-ink tracking-tight">
            {saludo}, {usuario?.nombre} 👋
          </h1>
          <p className="text-[13.5px] text-gecotex-ink-sub mt-1">
            Vas <span className={clsx('font-bold', isAhead ? 'text-gecotex-green' : 'text-gecotex-orange')}>
              {isAhead ? 'por delante' : 'ligeramente por debajo'}
            </span> de tu objetivo mensual.{' '}
            {isAhead ? 'Mantén el ritmo.' : '¡Puedes recuperarlo!'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Month/Year selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={mes}
                onChange={e => setMes(+e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 text-[13px] font-semibold text-gecotex-ink bg-white border border-gecotex-border rounded-lg shadow-sm hover:border-gecotex-blue transition-colors cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{nombreMes(i + 1)}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gecotex-ink-muted pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={año}
                onChange={e => setAño(+e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 text-[13px] font-semibold text-gecotex-ink bg-white border border-gecotex-border rounded-lg shadow-sm hover:border-gecotex-blue transition-colors cursor-pointer"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gecotex-ink-muted pointer-events-none" />
            </div>
          </div>
          <button onClick={() => navigate('/expedientes/nuevo')} className="btn-primary flex items-center gap-2 px-5 py-2.5">
            <Plus size={18} /> Nuevo expediente
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <KpiCard
            titulo="UPs producidas"
            ayuda="Las UPs (Unidades Ponderadas) miden la carga de trabajo procesada. Se calculan automáticamente según el tipo de DUA, el número de partidas arancelarias e incrementadores de cada expediente. La barra muestra el progreso hacia tu objetivo."
            valor={fmtUP(kpis?.up_producidas)}
            unit={`/ ${kpis?.objetivo_up || '—'}`}
            subtitulo={kpis?.up_producidas > 0 && kpis?.objetivo_up > 0 ? `${((kpis.up_producidas / kpis.objetivo_up - 1) * 100) >= 0 ? '+' : ''}${((kpis.up_producidas / kpis.objetivo_up - 1) * 100).toFixed(0)}%` : ''}
            icono={Package}
            color={isAhead ? 'verde' : 'orange'}
            progreso={kpis?.pct_cumplimiento}
            footer={isAhead ? "Objetivo mensual superado ✓" : "Objetivo en progreso…"}
          />
          {textoKpi('ups', kpis?.up_producidas) && (
            <p className="text-xs text-gecotex-ink-muted px-1">{textoKpi('ups', kpis?.up_producidas)}</p>
          )}
        </div>

        <div className="space-y-1">
          <KpiCard
            titulo="Factor K"
            ayuda="K = UPs producidas ÷ Objetivo mensual. Un Factor K ≥ 1.0 significa que has alcanzado o superado tu objetivo. El Factor K determina el tramo de bonus que recibirás al final del período."
            valor={fmtK(kpis?.factor_k)}
            icono={Sparkles}
            color={isAhead ? 'verde' : 'orange'}
            footer={isAhead ? "Objetivo alcanzado — bonus activo" : "Por debajo del umbral de bonus"}
          />
          {textoKpi('factor_k', kpis?.factor_k) && (
            <p className="text-xs text-gecotex-ink-muted px-1">{textoKpi('factor_k', kpis?.factor_k)}</p>
          )}
        </div>

        <div className="space-y-1">
          <KpiCard
            titulo="Tasa ocupación"
            ayuda="Porcentaje del tiempo disponible dedicado a expedientes. Se calcula con el tiempo registrado mediante el cronómetro. Una tasa entre 70-90% es el rango óptimo."
            valor={kpis?.tasa_ocupacion != null ? kpis.tasa_ocupacion.toFixed(0) : '—'}
            unit="%"
            icono={Award}
            color={kpis?.tasa_ocupacion >= 90 ? 'naranja' : kpis?.tasa_ocupacion >= 70 ? 'verde' : 'blue'}
            progreso={Math.min(100, kpis?.tasa_ocupacion || 0)}
            footer="% del tiempo disponible utilizado"
          />
          {textoKpi('ocupacion', kpis?.tasa_ocupacion) && (
            <p className="text-xs text-gecotex-ink-muted px-1">{textoKpi('ocupacion', kpis?.tasa_ocupacion)}</p>
          )}
        </div>

        <div className="space-y-1">
          <KpiCard
            titulo="Expedientes"
            ayuda="Total de expedientes gestionados este mes."
            valor={kpis?.num_expedientes ?? '—'}
            icono={FileText}
            color="navy"
            footer="Expedientes este mes"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Timer or Info */}
        <div className="lg:col-span-1">
          {sesionActiva ? (
            <div className="bg-gradient-to-br from-gecotex-navy-dark to-gecotex-navy text-white rounded-[10px] p-6 shadow-[0_12px_28px_rgba(31,56,100,0.25)] relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[radial-gradient(circle,rgba(46,117,182,0.32)_0%,transparent_70%)]" />
              
              <div className="flex items-center justify-between relative z-10 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3ddc7c] shadow-[0_0_0_4px_rgba(61,220,124,0.25)]" />
                  <span className="text-[11.5px] font-bold tracking-widest uppercase text-white/85">Sesión activa</span>
                </div>
                <Clock size={18} className="text-white/60" />
              </div>

              <div className="relative z-10 mb-6">
                <p className="text-[11.5px] text-white/55 tracking-wide uppercase font-bold mb-1">Expediente en curso</p>
                <p className="font-mono text-base font-semibold text-white mb-0.5">{sesionActiva.numero_expediente || 'EXP-SIN-NUM'}</p>
                <p className="text-[13px] text-white/70 truncate">{sesionActiva.cliente_nombre || 'Cliente desconocido'}</p>
              </div>

              <div className="flex items-baseline gap-2 relative z-10 mb-6">
                <span className="text-5xl font-bold font-mono tracking-tight leading-none">{formatearTiempo(segundos)}</span>
                <span className="text-[13px] text-white/55 font-semibold">HH:MM:SS</span>
              </div>

              <div className="grid grid-cols-2 gap-3 relative z-10">
                <button
                  onClick={pausar}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/10 border border-white/20 rounded-lg text-[13.5px] font-bold hover:bg-white/20 transition-all"
                >
                  <Pause size={16} /> Pausar
                </button>
                <button
                  onClick={finalizar}
                  className="flex items-center justify-center gap-2 py-2.5 bg-gecotex-blue border border-gecotex-blue rounded-lg text-[13.5px] font-bold hover:opacity-90 transition-all"
                >
                  <StopCircle size={16} /> Finalizar
                </button>
              </div>
            </div>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center text-center p-8 border-dashed border-2">
              <div className="w-16 h-16 bg-gecotex-bg rounded-full flex items-center justify-center mb-4">
                <Timer size={32} className="text-gecotex-ink-muted" />
              </div>
              <h3 className="text-base font-bold text-gecotex-ink mb-2">Sin sesión activa</h3>
              <p className="text-sm text-gecotex-ink-sub mb-1 leading-relaxed">
                Abre un expediente y pulsa <strong className="text-gecotex-ink">▶ Iniciar cronómetro</strong> para registrar el tiempo trabajado.
              </p>
              <p className="text-xs text-gecotex-ink-muted mb-6">El tiempo registrado contribuye al cálculo de tu tasa de ocupación.</p>
              <button
                onClick={() => navigate('/expedientes')}
                className="btn-soft px-6"
              >
                Ir a expedientes
              </button>
            </div>
          )}
        </div>

        {/* Right: Daily Chart */}
        <div className="lg:col-span-2">
          <div className="card h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[14px] font-bold text-gecotex-ink">UPs diarias · {nombreMes(mes)} {año}</h3>
                <p className="text-[11px] text-gecotex-ink-muted mt-0.5">Unidades Ponderadas producidas cada día del mes</p>
              </div>
              <div className="flex gap-4 text-[11.5px] font-semibold text-gecotex-ink-sub">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gecotex-blue" /> UPs del día</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-gecotex-orange" /> Objetivo diario</span>
              </div>
            </div>
            
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="dia" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#8893A4', fontWeight: 600, fontFamily: 'JetBrains Mono' }}
                    interval={2}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#F4F6F9', radius: 4 }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <ReferenceLine y={6.5} stroke="#E67E22" strokeDasharray="3 3" strokeWidth={2} />
                  <Bar dataKey="up" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.dia === now.getDate() ? '#1F3864' : '#2E75B6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluación semestral */}
      {miEval && (
        <div
          className="card flex items-center gap-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/mi-evaluacion')}
        >
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            miEval.estado === 'cerrada' ? 'bg-gecotex-green/10' :
            miEval.estado === 'completada' ? 'bg-green-50' :
            miEval.estado === 'auto_evaluacion' ? 'bg-blue-50' : 'bg-gray-100'
          )}>
            <ClipboardCheck size={24} className={clsx(
              miEval.estado === 'cerrada' || miEval.estado === 'completada' ? 'text-gecotex-green' :
              miEval.estado === 'auto_evaluacion' ? 'text-blue-500' : 'text-gray-400'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-gecotex-ink">
              Evaluación Semestral · S{miEval.semestre} {miEval.año}
            </p>
            <p className="text-[12px] text-gecotex-ink-sub mt-0.5">
              {miEval.estado === 'auto_evaluacion' && 'Pendiente: completa tu autoevaluación'}
              {miEval.estado === 'evaluacion_dir' && 'En revisión por dirección'}
              {miEval.estado === 'completada' && `Puntuación: ${miEval.puntuacion_total?.toFixed(1) || '—'} · Bonus calculado`}
              {miEval.estado === 'cerrada' && `Cerrada · Bonus: ${miEval.bonus_semestral_euros?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '—'}`}
              {miEval.estado === 'borrador' && 'Período iniciado — pendiente de autoevaluación'}
            </p>
          </div>
          {miEval.estado === 'auto_evaluacion' && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex-shrink-0">
              Acción requerida
            </span>
          )}
          {miEval.bonus_semestral_euros != null && miEval.estado !== 'auto_evaluacion' && (
            <p className="text-lg font-bold text-gecotex-primary flex-shrink-0">
              {miEval.bonus_semestral_euros.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          )}
          <ChevronRight size={16} className="text-gecotex-ink-muted flex-shrink-0" />
        </div>
      )}

      {/* Recent Expedientes Card */}
      <div className="card overflow-hidden !p-0">
        <div className="flex items-center justify-between p-5 border-b border-gecotex-border-soft">
          <h3 className="text-[14px] font-bold text-gecotex-ink">Expedientes recientes</h3>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gecotex-bg border border-gecotex-border rounded-lg">
              <Search size={14} className="text-gecotex-ink-muted" />
              <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-xs w-32" />
            </div>
            <button className="btn-soft !py-1.5 !px-3 flex items-center gap-1.5">
              <Filter size={14} /> Filtros
            </button>
            <button onClick={() => navigate('/expedientes')} className="btn-soft !py-1.5 !px-3">
              Ver todos
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gecotex-bg/50">
                <th className="table-header">Nº Expediente</th>
                <th className="table-header">Cliente</th>
                <th className="table-header">Tipo DUA</th>
                <th className="table-header">Canal</th>
                <th className="table-header text-right">UPs</th>
                <th className="table-header">Fecha</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gecotex-border-soft">
              {expedientes.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gecotex-ink-muted text-sm">Sin expedientes este mes</td></tr>
              ) : expedientes.slice(0, 8).map(exp => (
                <tr
                  key={exp.id}
                  className="hover:bg-gecotex-bg/50 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/expedientes/${exp.id}`)}
                >
                  <td className="table-cell font-mono font-bold text-gecotex-navy">{exp.numero_expediente}</td>
                  <td className="table-cell font-semibold">{exp.cliente_nombre}</td>
                  <td className="table-cell text-gecotex-ink-sub">{exp.tipo_dua_nombre}</td>
                  <td className="table-cell">
                    <Semaforo valor={exp.canal_respuesta} tipo="canal" size="sm" />
                  </td>
                  <td className="table-cell text-right font-mono font-bold text-gecotex-ink">
                    {fmtUP(exp.up_calculadas)}
                  </td>
                  <td className="table-cell text-xs text-gecotex-ink-muted">
                    {fmtFechaHora(exp.fecha_apertura_dossier)}
                  </td>
                  <td className="table-cell text-right">
                    <ChevronRight size={16} className="text-gecotex-ink-muted group-hover:text-gecotex-blue transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

