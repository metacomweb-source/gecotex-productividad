import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Loader2, Download, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const ESTADOS = {
  borrador: { label: 'Borrador', cls: 'bg-gray-100 text-gray-600' },
  auto_evaluacion: { label: 'Auto pendiente', cls: 'bg-blue-100 text-blue-700' },
  evaluacion_dir: { label: 'Pendiente dirección', cls: 'bg-orange-100 text-orange-700' },
  completada: { label: 'Completada', cls: 'bg-green-100 text-green-700' },
  cerrada: { label: 'Cerrada', cls: 'bg-gecotex-primary/10 text-gecotex-primary font-semibold' },
}

function BadgeEstado({ estado }) {
  const { label, cls } = ESTADOS[estado] || { label: estado, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{label}</span>
}

function PuntCell({ valor }) {
  if (valor == null) return <span className="text-gray-300">—</span>
  const color = valor >= 8.5 ? 'text-green-600' : valor >= 7 ? 'text-orange-500' : valor >= 5 ? 'text-yellow-600' : 'text-red-500'
  return <span className={`font-bold ${color}`}>{valor.toFixed(1)}</span>
}

export default function EvaluacionesBonus() {
  const navigate = useNavigate()
  const [año, setAño] = useState(new Date().getFullYear())
  const [semestre, setSemestre] = useState(new Date().getMonth() < 6 ? 1 : 2)
  const [evaluaciones, setEvaluaciones] = useState([])
  const [factorEquipo, setFactorEquipo] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [iniciando, setIniciando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [descargando, setDescargando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const [evR, feR, cfgR] = await Promise.allSettled([
        api.get(`/bonus/evaluaciones/${año}/${semestre}`),
        api.get(`/bonus/factor-equipo/${año}/${semestre}`),
        api.get(`/bonus/config/${año}/${semestre}`),
      ])
      setEvaluaciones(evR.status === 'fulfilled' ? evR.value.data : [])
      setFactorEquipo(feR.status === 'fulfilled' ? feR.value.data : null)
      setConfig(cfgR.status === 'fulfilled' ? cfgR.value.data : null)
    } catch {
      setEvaluaciones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [año, semestre])

  const handleIniciarPeriodo = async () => {
    if (!config) {
      toast.error('Primero configura el período en Configuración → Bonus')
      return
    }
    setIniciando(true)
    try {
      const r = await api.post('/bonus/evaluaciones/iniciar', { año, semestre })
      if (r.data.evaluaciones_creadas > 0) {
        toast.success(`${r.data.evaluaciones_creadas} evaluaciones creadas`)
      } else {
        toast.success('Todas las evaluaciones del período ya existen')
      }
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al iniciar el período')
    } finally {
      setIniciando(false)
    }
  }

  const handleCerrar = async (id) => {
    try {
      await api.post(`/bonus/evaluaciones/${id}/cerrar`)
      toast.success('Evaluación cerrada')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error')
    }
  }

  const handleExportar = async () => {
    setDescargando(true)
    try {
      const r = await api.get(`/bonus/exportar/${año}/${semestre}`, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `GECOTEX_Bonus_${año}_S${semestre}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al exportar')
    } finally {
      setDescargando(false)
    }
  }

  const evsFiltradas = filtroEstado ? evaluaciones.filter(e => e.estado === filtroEstado) : evaluaciones
  const totalBonus = evaluaciones.reduce((s, e) => s + (e.bonus_semestral_euros || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gecotex-primary">Bonus y Evaluaciones</h1>
        <div className="flex gap-2 flex-wrap">
          <select className="input-field w-28" value={año} onChange={e => setAño(+e.target.value)}>
            {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <select className="input-field w-36" value={semestre} onChange={e => setSemestre(+e.target.value)}>
            <option value={1}>Semestre 1 (Ene–Jun)</option>
            <option value={2}>Semestre 2 (Jul–Dic)</option>
          </select>
          {config && !loading && (
            <button onClick={handleIniciarPeriodo} disabled={iniciando} className="btn-primary flex items-center gap-2">
              {iniciando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {evaluaciones.length === 0 ? 'Iniciar período' : 'Crear evaluaciones faltantes'}
            </button>
          )}
          {evaluaciones.length > 0 && (
            <button onClick={handleExportar} disabled={descargando} className="btn-secondary flex items-center gap-2">
              {descargando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Excel
            </button>
          )}
          <button onClick={cargar} className="p-2 rounded-lg border hover:bg-gray-50 transition-colors">
            <RefreshCw size={15} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* KPIs header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-xs text-gray-500">Evaluaciones</p>
          <p className="text-2xl font-bold text-gecotex-primary">{evaluaciones.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500">Completadas</p>
          <p className="text-2xl font-bold text-green-600">
            {evaluaciones.filter(e => ['completada', 'cerrada'].includes(e.estado)).length}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500">Bonus total estimado</p>
          <p className="text-xl font-bold text-gecotex-primary">
            {totalBonus.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Factor Equipo</p>
          {factorEquipo ? (
            <div>
              <span className={`text-sm font-bold ${factorEquipo.activado ? 'text-green-600' : 'text-gray-500'}`}>
                {factorEquipo.activado ? '✓ Activado' : 'No activado'}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">{factorEquipo.meses_cumplidos}/{factorEquipo.meses_totales} meses cumplidos</p>
            </div>
          ) : <span className="text-gray-300 text-sm">—</span>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-gecotex-primary" /></div>
      ) : evaluaciones.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium">No hay evaluaciones para este período</p>
          {config ? (
            <p className="text-sm mt-1">Haz clic en "Iniciar período" para crear las evaluaciones de los empleados elegibles.</p>
          ) : (
            <p className="text-sm mt-1 text-orange-500">Primero configura el período en Configuración → Bonus.</p>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setFiltroEstado('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!filtroEstado ? 'bg-gecotex-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Todos ({evaluaciones.length})
            </button>
            {Object.entries(ESTADOS).map(([key, { label }]) => {
              const cnt = evaluaciones.filter(e => e.estado === key).length
              if (!cnt) return null
              return (
                <button
                  key={key}
                  onClick={() => setFiltroEstado(key === filtroEstado ? '' : key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtroEstado === key ? 'bg-gecotex-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {label} ({cnt})
                </button>
              )
            })}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 text-xs">
                <th className="pb-2 font-medium">Empleado</th>
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 font-medium text-center">Área 1</th>
                <th className="pb-2 font-medium text-center">Área 2</th>
                <th className="pb-2 font-medium text-center">Área 3</th>
                <th className="pb-2 font-medium text-center">Área 4</th>
                <th className="pb-2 font-medium text-center">Total</th>
                <th className="pb-2 font-medium text-right">Bonus est.</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {evsFiltradas.map(ev => (
                <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 font-medium">{ev.empleado_nombre || `#${ev.empleado_id}`}</td>
                  <td className="py-3"><BadgeEstado estado={ev.estado} /></td>
                  <td className="py-3 text-center"><PuntCell valor={ev.puntuacion_area1} /></td>
                  <td className="py-3 text-center"><PuntCell valor={ev.puntuacion_area2} /></td>
                  <td className="py-3 text-center"><PuntCell valor={ev.puntuacion_area3} /></td>
                  <td className="py-3 text-center"><PuntCell valor={ev.puntuacion_area4} /></td>
                  <td className="py-3 text-center"><PuntCell valor={ev.puntuacion_total} /></td>
                  <td className="py-3 text-right font-medium">
                    {ev.bonus_semestral_euros != null
                      ? ev.bonus_semestral_euros.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
                      : '—'}
                    {ev.estado !== 'cerrada' && ev.bonus_semestral_euros != null && (
                      <span className="text-gray-400 font-normal text-xs ml-1">est.</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {ev.estado === 'evaluacion_dir' && (
                        <button
                          onClick={() => navigate(`/evaluaciones-bonus/${ev.id}`)}
                          className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                        >
                          Evaluar
                        </button>
                      )}
                      {ev.estado === 'completada' && (
                        <>
                          <button
                            onClick={() => navigate(`/evaluaciones-bonus/${ev.id}`)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => handleCerrar(ev.id)}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            Cerrar
                          </button>
                        </>
                      )}
                      {['borrador', 'cerrada'].includes(ev.estado) && (
                        <button
                          onClick={() => navigate(`/evaluaciones-bonus/${ev.id}`)}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Ver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
