import { useEffect, useState, useContext } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { expedientesApi, informesApi, clientesApi, usuariosApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { RegistroRapidoContext } from '../App'
import Semaforo from '../components/Semaforo'
import { Plus, Search, Download, Filter, RefreshCw, Zap } from 'lucide-react'
import { fmtUP, fmtFechaHora, nombreMes, descargarBlob } from '../utils/formatters'
import toast from 'react-hot-toast'

const MESES = Array.from({length: 12}, (_, i) => ({ value: i+1, label: nombreMes(i+1) }))

export default function Expedientes() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isCoordinador, isAdmin } = useAuth()
  const setShowRegistroRapido = useContext(RegistroRapidoContext)
  const now = new Date()
  const [expedientes, setExpedientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState([])
  const [operarios, setOperarios] = useState([])
  const [filtros, setFiltros] = useState({
    año: now.getFullYear(),
    mes: now.getMonth() + 1,
    canal: '',
    tipo_trafico: '',
    search: '',
    cliente_id: '',
    operario_id: searchParams.get('operario_id') || '',
  })

  useEffect(() => {
    clientesApi.listar().then(r => setClientes(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    if (isAdmin) {
      usuariosApi.listar().then(r => setOperarios(Array.isArray(r.data) ? r.data.filter(u => u.rol === 'operario' || u.rol === 'coordinador') : [])).catch(() => {})
    }
  }, [isAdmin])

  const fetchExpedientes = () => {
    setLoading(true)
    const params = { año: filtros.año, mes: filtros.mes, limit: 200 }
    if (filtros.canal) params.canal = filtros.canal
    if (filtros.tipo_trafico) params.tipo_trafico = filtros.tipo_trafico
    if (filtros.cliente_id) params.cliente_id = filtros.cliente_id
    if (filtros.operario_id) params.operario_id = filtros.operario_id
    expedientesApi.listar(params)
      .then(r => setExpedientes(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchExpedientes() }, [filtros.año, filtros.mes, filtros.canal, filtros.tipo_trafico, filtros.cliente_id, filtros.operario_id])

  const filteredExpedientes = expedientes.filter(e =>
    !filtros.search ||
    e.numero_expediente?.toLowerCase().includes(filtros.search.toLowerCase()) ||
    e.cliente_nombre?.toLowerCase().includes(filtros.search.toLowerCase())
  )

  const handleExport = async () => {
    try {
      const r = await informesApi.expedientes({ año: filtros.año, mes: filtros.mes })
      descargarBlob(r.data, `expedientes_${filtros.año}_${filtros.mes.toString().padStart(2,'0')}.xlsx`)
      toast.success('Excel descargado')
    } catch { toast.error('Error al exportar') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gecotex-primary">Expedientes</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Excel
          </button>
          <button onClick={() => setShowRegistroRapido && setShowRegistroRapido(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Zap size={15} /> Registro rápido
          </button>
          <button onClick={() => navigate('/expedientes/nuevo')} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Nuevo expediente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-44">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9 text-sm"
              placeholder="Buscar por expediente o cliente..."
              value={filtros.search}
              onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <select className="input-field w-auto text-sm" value={filtros.mes} onChange={e => setFiltros(f => ({...f, mes: +e.target.value}))}>
            {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="input-field w-auto text-sm" value={filtros.año} onChange={e => setFiltros(f => ({...f, año: +e.target.value}))}>
            {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input-field w-auto text-sm" value={filtros.canal} onChange={e => setFiltros(f => ({...f, canal: e.target.value}))}>
            <option value="">Todos los canales</option>
            <option value="verde">Verde</option>
            <option value="naranja">Naranja</option>
            <option value="rojo">Rojo</option>
            <option value="pendiente">Pendiente</option>
          </select>
          <select className="input-field w-auto text-sm" value={filtros.tipo_trafico} onChange={e => setFiltros(f => ({...f, tipo_trafico: e.target.value}))}>
            <option value="">Todos los tráficos</option>
            <option value="exportacion">Exportación</option>
            <option value="importacion">Importación</option>
            <option value="regimen_especial">Régimen especial</option>
          </select>
          {clientes.length > 0 && (
            <select className="input-field w-auto text-sm" value={filtros.cliente_id} onChange={e => setFiltros(f => ({...f, cliente_id: e.target.value}))}>
              <option value="">Todos los clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
          {isAdmin && operarios.length > 0 && (
            <select className="input-field w-auto text-sm" value={filtros.operario_id} onChange={e => setFiltros(f => ({...f, operario_id: e.target.value}))}>
              <option value="">Todos los empleados</option>
              {operarios.map(op => <option key={op.id} value={op.id}>{op.nombre} {op.apellidos}</option>)}
            </select>
          )}
          <button onClick={fetchExpedientes} className="btn-secondary text-sm flex items-center gap-1">
            <RefreshCw size={14} /> Refrescar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Expediente', 'Cliente', 'Tipo DUA', 'Canal', 'UPs', 'Partidas', 'Operario', 'Fecha apertura', 'Fecha levante'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gecotex-primary mx-auto" /></td></tr>
              ) : filteredExpedientes.length === 0 ? (
                <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-10">Sin expedientes para los filtros seleccionados</td></tr>
              ) : filteredExpedientes.map(exp => (
                <tr
                  key={exp.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/expedientes/${exp.id}`)}
                >
                  <td className="table-cell font-mono text-xs font-medium text-gecotex-primary">
                    {exp.numero_expediente}
                    {exp.origen === 'registro_rapido' && !exp.fecha_levante && (
                      <span className="ml-1.5 inline-flex px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded align-middle">Incompleto</span>
                    )}
                  </td>
                  <td className="table-cell max-w-36 truncate">{exp.cliente_nombre}</td>
                  <td className="table-cell text-xs">{exp.tipo_dua_nombre}</td>
                  <td className="table-cell"><Semaforo valor={exp.canal_respuesta} tipo="canal" /></td>
                  <td className="table-cell font-semibold text-gecotex-primary">{fmtUP(exp.up_calculadas)}</td>
                  <td className="table-cell text-center">{exp.num_partidas}</td>
                  <td className="table-cell text-xs text-gray-500">{exp.operario_nombre}</td>
                  <td className="table-cell text-xs text-gray-500">{fmtFechaHora(exp.fecha_apertura_dossier)}</td>
                  <td className="table-cell text-xs text-gray-500">{fmtFechaHora(exp.fecha_levante)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {filteredExpedientes.length} expedientes · UPs totales: {fmtUP(filteredExpedientes.reduce((s, e) => s + (e.up_calculadas || 0), 0))}
          </div>
        )}
      </div>
    </div>
  )
}
