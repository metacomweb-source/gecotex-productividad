import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { expedientesApi, sesionesApi } from '../api/client'
import { useRef } from 'react'
import { useCronometro } from '../context/CronometroContext'
import Semaforo from '../components/Semaforo'
import { ArrowLeft, Pencil, Download, Play, Pause, StopCircle, Mail, Folder, Send, CheckCircle2, Receipt, Clock, AlertTriangle, MoreHorizontal, Plus, Paperclip, Trash2, RefreshCw } from 'lucide-react'
import { fmtFechaHora, fmtMinutos, fmtUP } from '../utils/formatters'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const Timeline = ({ phases }) => {
  return (
    <div className="pt-2 pb-4">
      <div className="grid grid-cols-5 relative">
        {/* Connector line background */}
        <div className="absolute top-[42px] left-[10%] right-[10%] h-0.5 bg-gecotex-border-soft" />

        {phases.map((p, i) => {
          const done = Boolean(p.time)
          const warn = p.warn
          return (
            <div key={i} className="flex flex-col items-center relative z-10">
              {/* Connector line colored */}
              {i > 0 && phases[i-1].time && (
                <div className={clsx(
                  "absolute top-[42px] left-[-50%] right-[50%] h-0.5 z-0",
                  warn ? "bg-gecotex-red" : "bg-gecotex-green"
                )} />
              )}
              
              {/* Delta badge */}
              {p.delta && (
                <div className="absolute top-0 left-[-50%] right-[50%] flex justify-center pointer-events-none">
                  <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full font-mono tracking-wider",
                    warn ? "text-gecotex-red bg-gecotex-red-soft" : (done ? "text-gecotex-green bg-gecotex-green-soft" : "text-gecotex-ink-muted bg-gecotex-border-soft")
                  )}>
                    {p.delta}
                  </span>
                </div>
              )}

              {/* Node */}
              <div className={clsx(
                "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all mt-4 mb-2 shadow-sm",
                done ? "bg-white" : "bg-gecotex-bg",
                warn ? "border-gecotex-red" : (done ? "border-gecotex-green" : "border-gecotex-border")
              )}>
                <p.icon size={20} className={clsx(
                  warn ? "text-gecotex-red" : (done ? "text-gecotex-green" : "text-gecotex-ink-muted")
                )} />
              </div>

              <div className={clsx("text-[12.5px] font-bold text-center", done ? "text-gecotex-ink" : "text-gecotex-ink-muted")}>
                {p.label}
              </div>
              <div className="text-[11px] text-gecotex-ink-muted font-mono mt-0.5">
                {p.time || 'Pendiente'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ExpedienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sesionActiva, iniciar, pausar, finalizar, formatearTiempo, segundos } = useCronometro()
  const [exp, setExp] = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef(null)

  useEffect(() => {
    Promise.all([
      expedientesApi.obtener(id),
      sesionesApi.porExpediente(id),
    ])
      .then(([expRes, sesRes]) => { setExp(expRes.data); setSesiones(sesRes.data) })
      .catch(e => { toast.error('Error cargando expediente'); navigate('/expedientes') })
      .finally(() => setLoading(false))
  }, [id])

  const tiempoTotalSesiones = sesiones.reduce((s, ses) => s + (ses.duracion_minutos || 0), 0)
  const sesionEsteExp = sesionActiva?.expediente_id === +id

  const handleIniciar = async () => {
    try { await iniciar(+id, exp?.numero_expediente) }
    catch (err) { toast.error(err.response?.data?.detail || 'Error al iniciar cronómetro') }
  }

  const handleDescargarDoc = async () => {
    try {
      const r = await expedientesApi.descargarDocumento(id)
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = exp.documento_dua_nombre
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Error al descargar el documento') }
  }

  const handleEliminarDoc = async () => {
    try {
      await expedientesApi.eliminarDocumento(id)
      setExp(e => ({ ...e, documento_dua_nombre: null }))
      toast.success('Documento eliminado')
    } catch { toast.error('Error al eliminar el documento') }
  }

  const handleSubirDoc = async (file) => {
    if (!file) return
    try {
      await expedientesApi.subirDocumento(id, file)
      setExp(e => ({ ...e, documento_dua_nombre: file.name }))
      toast.success('Documento adjuntado')
    } catch { toast.error('Error al subir el documento') }
  }

  const fmtDelta = (a, b) => {
    if (!a || !b) return null
    const diff = (new Date(b) - new Date(a)) / 60000
    if (diff < 60) return `${Math.round(diff)}m`
    const h = Math.floor(diff / 60)
    const m = Math.round(diff % 60)
    return `${h}h ${m}m`
  }

  const phases = [
    { icon: Mail, label: 'Recepción', time: exp?.fecha_recepcion_correo?.slice(11, 16), delta: null },
    { icon: Folder, label: 'Apertura', time: exp?.fecha_apertura_dossier?.slice(11, 16), delta: fmtDelta(exp?.fecha_recepcion_correo, exp?.fecha_apertura_dossier), warn: (new Date(exp?.fecha_apertura_dossier) - new Date(exp?.fecha_recepcion_correo)) / 60000 > 60 },
    { icon: Send, label: 'Envío Aduana', time: exp?.fecha_envio_aduana?.slice(11, 16), delta: fmtDelta(exp?.fecha_apertura_dossier, exp?.fecha_envio_aduana) },
    { icon: CheckCircle2, label: 'Levante', time: exp?.fecha_levante?.slice(11, 16), delta: fmtDelta(exp?.fecha_envio_aduana, exp?.fecha_levante) },
    { icon: Receipt, label: 'Facturación', time: exp?.fecha_envio_facturacion?.slice(11, 16), delta: fmtDelta(exp?.fecha_levante, exp?.fecha_envio_facturacion) },
  ]

  if (loading) return (
    <div className="space-y-6">
      <div className="h-16 bg-white rounded-xl animate-pulse" />
      <div className="h-48 bg-white rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 bg-white rounded-xl animate-pulse" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    </div>
  )
  if (!exp) return null

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Topbar Internal */}
      <div className="bg-white border border-gecotex-border rounded-xl px-8 py-5 flex items-center justify-between shadow-gx-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gecotex-bg rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-gecotex-ink" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gecotex-ink tracking-tight flex items-center gap-2">
              <span className="font-mono text-gecotex-navy">{exp.numero_expediente}</span>
              <span className="text-gecotex-border">•</span>
              <span>{exp.tipo_dua_nombre}</span>
            </h1>
            <p className="text-[13px] text-gecotex-ink-sub">
              {exp.cliente_nombre} • Creado el {new Date(exp.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sesionEsteExp ? (
             <div className="flex items-center gap-3 bg-gecotex-navy px-4 py-1.5 rounded-lg text-white shadow-lg">
                <span className="text-lg font-black font-mono tracking-tighter">{formatearTiempo(segundos)}</span>
                <div className="flex gap-1 border-l border-white/20 pl-3 ml-1">
                  <button onClick={pausar} title="Pausar" className="p-1.5 hover:bg-white/10 rounded-md transition-colors"><Pause size={16} /></button>
                  <button onClick={finalizar} title="Finalizar" className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gecotex-red-soft"><StopCircle size={16} /></button>
                </div>
             </div>
          ) : (
            <button onClick={handleIniciar} className="btn-blue flex items-center gap-2">
              <Play size={16} /> {sesiones.length > 0 ? 'Reanudar cronómetro' : 'Iniciar cronómetro'}
            </button>
          )}
          <button onClick={() => navigate(`/expedientes/${id}/editar`)} className="btn-secondary flex items-center gap-2">
            <Pencil size={16} /> Editar
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      {/* Status Badges Row */}
      <div className="flex gap-2.5 flex-wrap">
        <Semaforo valor={exp.canal_respuesta} tipo="canal" size="lg" />
        <span className="bg-gecotex-navy/10 text-gecotex-navy border border-gecotex-navy/10 px-3 py-1.5 rounded-full text-[13px] font-bold">
           {exp.num_partidas} partidas arancelarias
        </span>
        <span className="bg-gecotex-blue-light text-gecotex-navy border border-gecotex-blue/10 px-3 py-1.5 rounded-full text-[13px] font-bold">
           {exp.tipo_trafico?.toUpperCase()}
        </span>
        <span className="bg-gecotex-bg text-gecotex-ink-sub border border-gecotex-border px-3 py-1.5 rounded-full text-[13px] font-bold">
           Operario: {exp.operario_nombre}
        </span>
      </div>

      {/* Timeline Card */}
      <div className="bg-white rounded-xl border border-gecotex-border-soft shadow-gx-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gecotex-border-soft flex justify-between items-center bg-gecotex-bg/30">
          <h3 className="text-[14px] font-bold text-gecotex-ink uppercase tracking-wider">Línea temporal del proceso</h3>
          {phases.some(p => p.warn) && (
            <span className="bg-gecotex-red-soft text-gecotex-red text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={10} /> Alerta SLA en tramos
            </span>
          )}
        </div>
        <div className="p-8">
          <Timeline phases={phases} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gecotex-border-soft shadow-gx-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gecotex-border-soft flex justify-between items-center bg-gecotex-bg/30">
              <h3 className="text-[14px] font-bold text-gecotex-ink uppercase tracking-wider">Sesiones de cronómetro</h3>
              <button className="btn-soft !py-1.5 !px-3 text-xs flex items-center gap-1.5">
                <Plus size={14} /> Añadir manual
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-gecotex-bg/50">
                    <th className="table-header w-16 text-center">#</th>
                    <th className="table-header">Operario</th>
                    <th className="table-header">Inicio</th>
                    <th className="table-header">Fin</th>
                    <th className="table-header text-right">Duración</th>
                    <th className="table-header"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gecotex-border-soft">
                  {sesiones.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-gecotex-ink-muted text-sm italic">Sin sesiones registradas</td></tr>
                  ) : sesiones.map((s, i) => (
                    <tr key={s.id} className={clsx("hover:bg-gecotex-bg/30", s.estado === 'activa' && "bg-gecotex-green-soft/30")}>
                      <td className="table-cell text-center font-mono font-bold text-gecotex-ink-muted">S-{sesiones.length - i}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gecotex-blue flex items-center justify-center text-white text-[10px] font-bold">
                            {exp.operario_nombre?.[0]}
                          </div>
                          <span className="font-semibold text-gecotex-ink">{exp.operario_nombre}</span>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-gecotex-ink-sub">{new Date(s.inicio).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="table-cell font-mono text-gecotex-ink-sub">
                        {s.fin ? new Date(s.fin).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : (
                          <span className="flex items-center gap-1.5 text-gecotex-green font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-gecotex-green animate-pulse" />
                            En curso
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right font-mono font-bold text-gecotex-navy">{fmtMinutos(s.duracion_minutos)}</td>
                      <td className="table-cell text-right text-gecotex-ink-muted"><MoreHorizontal size={16} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gecotex-bg/40 font-bold">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-xs uppercase tracking-widest text-gecotex-ink-muted">Total tiempo invertido</td>
                    <td className="px-6 py-4 text-right font-mono text-base text-gecotex-navy">{fmtMinutos(tiempoTotalSesiones)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* UPs breakdown sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gecotex-border-soft shadow-gx-sm p-6 flex flex-col items-center text-center">
             <div className="flex items-center gap-2 mb-4 w-full justify-between">
                <h3 className="text-[12px] font-bold text-gecotex-ink-muted uppercase tracking-widest">UPs calculadas</h3>
                <span className="bg-gecotex-green-soft text-gecotex-green text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Confirmadas</span>
             </div>
             <div className="text-6xl font-black text-gecotex-navy tracking-tighter font-mono leading-none my-4">
               {fmtUP(exp.up_calculadas)}
             </div>
             <p className="text-[13px] text-gecotex-ink-sub mb-6">Unidades Productivas totales</p>
             
             <div className="w-full space-y-3 pt-6 border-t border-dashed border-gecotex-border-soft">
                <div className="flex justify-between text-[13px]">
                   <span className="text-gecotex-ink-sub">{exp.tipo_dua_nombre} (base)</span>
                   <span className="font-bold text-gecotex-ink">{exp.up_calculadas ? (exp.up_calculadas - exp.partidas_adicionales_count * 0.1).toFixed(2) : '0.00'}</span>
                </div>
                {exp.partidas_adicionales_count > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gecotex-ink-sub">Partidas extra ({exp.partidas_adicionales_count})</span>
                    <span className="font-bold text-gecotex-ink">+{(exp.partidas_adicionales_count * 0.1).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[14px] pt-2 font-bold text-gecotex-navy">
                   <span>Aplicado a bonus</span>
                   <span className="font-mono">{fmtUP(exp.up_calculadas)} UP</span>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-xl border border-gecotex-border-soft shadow-gx-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip size={16} className="text-gecotex-blue" />
              <h3 className="text-[12px] font-bold text-gecotex-ink-muted uppercase tracking-widest">Documento DUA</h3>
            </div>
            {exp.documento_dua_nombre ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gecotex-blue-light rounded-lg">
                  <Paperclip size={13} className="text-gecotex-blue shrink-0" />
                  <span className="text-[12px] font-medium text-gecotex-ink flex-1 truncate">{exp.documento_dua_nombre}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDescargarDoc} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[12px] font-semibold bg-gecotex-blue text-white rounded-lg hover:bg-gecotex-navy transition-colors">
                    <Download size={13} /> Descargar
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 border border-gecotex-border rounded-lg hover:bg-gecotex-bg transition-colors" title="Reemplazar">
                    <RefreshCw size={13} className="text-gecotex-ink-muted" />
                  </button>
                  <button onClick={handleEliminarDoc} className="p-1.5 border border-gecotex-red/30 rounded-lg hover:bg-gecotex-red-soft transition-colors" title="Eliminar">
                    <Trash2 size={13} className="text-gecotex-red" />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gecotex-border rounded-xl text-[12px] font-medium text-gecotex-ink-muted hover:border-gecotex-blue hover:text-gecotex-blue hover:bg-gecotex-blue-light/30 transition-all">
                <Paperclip size={14} /> Adjuntar documento DUA
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => handleSubirDoc(e.target.files[0])}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

