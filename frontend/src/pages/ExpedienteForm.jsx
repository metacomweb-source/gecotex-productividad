import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { expedientesApi, tiposDuaApi, incrementadoresApi, usuariosApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { calcularUP, calcularValorFacturacion } from '../utils/calculos'
import { ArrowLeft, Save, Mail, Folder, Send, CheckCircle2, Receipt, Users, Calendar, Shield, Sparkles, Info, ChevronRight, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Tooltip from '../components/Tooltip'

const Section = ({ number, title, subtitle, children }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-lg bg-gecotex-navy text-white flex items-center justify-center text-[13px] font-bold">
        {number}
      </div>
      <div>
        <h2 className="text-[15px] font-bold text-gecotex-ink tracking-tight">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-gecotex-ink-sub">{subtitle}</p>}
      </div>
    </div>
    <div className="bg-white rounded-[10px] border border-gecotex-border-soft shadow-gx-sm p-5">
      {children}
    </div>
  </div>
)

export default function ExpedienteForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { usuario, isCoordinador } = useAuth()

  const [tiposDua, setTiposDua] = useState([])
  const [incrementadores, setIncrementadores] = useState([])
  const [operarios, setOperarios] = useState([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    numero_expediente: '',
    operario_id: usuario?.id || '',
    tipo_dua_id: '',
    cliente_nombre: '',
    tipo_trafico: 'exportacion',
    num_partidas: 1,
    canal_respuesta: 'pendiente',
    fecha_recepcion_correo: '',
    fecha_apertura_dossier: '',
    fecha_envio_aduana: '',
    fecha_levante: '',
    fecha_envio_facturacion: '',
    servicios_adicionales: [],
    notas: '',
  })

  useEffect(() => {
    Promise.all([
      tiposDuaApi.listar(),
      incrementadoresApi.listar(),
      isCoordinador ? usuariosApi.listar() : Promise.resolve({ data: [] }),
    ]).then(([tipos, incs, ops]) => {
      setTiposDua(Array.isArray(tipos.data) ? tipos.data : [])
      setIncrementadores(Array.isArray(incs.data) ? incs.data : [])
      setOperarios(Array.isArray(ops.data) ? ops.data.filter(u => u.rol === 'operario' || u.rol === 'coordinador') : [])
    }).catch(() => {
      toast.error('No se pudieron cargar los datos del formulario. Comprueba que el backend está activo.')
    })

    if (isEdit) {
      expedientesApi.obtener(id).then(r => {
        const e = r.data
        setForm({
          numero_expediente: e.numero_expediente,
          operario_id: e.operario_id,
          tipo_dua_id: e.tipo_dua_id,
          cliente_nombre: e.cliente_nombre,
          tipo_trafico: e.tipo_trafico,
          num_partidas: e.num_partidas,
          canal_respuesta: e.canal_respuesta,
          fecha_recepcion_correo: e.fecha_recepcion_correo?.slice(0,16) || '',
          fecha_apertura_dossier: e.fecha_apertura_dossier?.slice(0,16) || '',
          fecha_envio_aduana: e.fecha_envio_aduana?.slice(0,16) || '',
          fecha_levante: e.fecha_levante?.slice(0,16) || '',
          fecha_envio_facturacion: e.fecha_envio_facturacion?.slice(0,16) || '',
          servicios_adicionales: e.servicios_adicionales || [],
          notas: e.notas || '',
        })
      })
    }
  }, [id, isCoordinador])

  const tipoDuaSeleccionado = tiposDua.find(t => t.id === +form.tipo_dua_id)
  const incsSeleccionados = incrementadores.filter(i => form.servicios_adicionales.includes(i.id))
  const upPreview = calcularUP(tipoDuaSeleccionado, +form.num_partidas, incsSeleccionados)
  const valorPreview = calcularValorFacturacion(tipoDuaSeleccionado, +form.num_partidas, incsSeleccionados)

  const tiposFiltrados = tiposDua.filter(t => !form.tipo_trafico || t.tipo_trafico === form.tipo_trafico)

  const toggleInc = (incId) => {
    setForm(f => ({
      ...f,
      servicios_adicionales: f.servicios_adicionales.includes(incId)
        ? f.servicios_adicionales.filter(x => x !== incId)
        : [...f.servicios_adicionales, incId],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const faltantes = []
    if (!form.numero_expediente) faltantes.push('Número de expediente')
    if (!form.cliente_nombre) faltantes.push('Cliente')
    if (!form.tipo_dua_id) faltantes.push('Tipo de DUA (sección 2)')
    if (faltantes.length > 0) {
      toast.error(`Faltan campos obligatorios: ${faltantes.join(', ')}`)
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        tipo_dua_id: +form.tipo_dua_id,
        operario_id: +form.operario_id,
        num_partidas: +form.num_partidas,
        fecha_recepcion_correo: form.fecha_recepcion_correo || null,
        fecha_apertura_dossier: form.fecha_apertura_dossier || null,
        fecha_envio_aduana: form.fecha_envio_aduana || null,
        fecha_levante: form.fecha_levante || null,
        fecha_envio_facturacion: form.fecha_envio_facturacion || null,
      }
      if (isEdit) {
        await expedientesApi.actualizar(id, payload)
        toast.success('Expediente actualizado')
      } else {
        const r = await expedientesApi.crear(payload)
        toast.success('Expediente creado')
        navigate(`/expedientes/${r.data.id}`)
        return
      }
      navigate(`/expedientes/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error guardando')
    } finally { setLoading(false) }
  }

  return (
    <div className="h-full flex flex-col min-h-0 -m-6">
      {/* Topbar Internal */}
      <div className="bg-white border-b border-gecotex-border px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gecotex-bg rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-gecotex-ink" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gecotex-ink tracking-tight">
              {isEdit ? 'Editar expediente' : 'Nuevo expediente'}
            </h1>
            <p className="text-[13px] text-gecotex-ink-sub">
              {isEdit ? `Modificando ${form.numero_expediente}` : 'Registra el expediente para iniciar tramitación'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {loading ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Main Form Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gecotex-bg">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gecotex-ink-muted uppercase tracking-wider mb-6">
              <span>Expedientes</span>
              <ChevronRight size={12} />
              <span className="text-gecotex-blue">{isEdit ? 'Editar' : 'Nuevo'} expediente</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Section number="1" title="Datos generales" subtitle="Información básica del cliente y operación">
                <p className="text-[11px] text-gecotex-ink-muted mb-4">Los campos marcados con <span className="text-gecotex-red font-bold">*</span> son obligatorios.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="label">Número de expediente <span className="text-gecotex-red">*</span></label>
                    <div className="relative">
                      <input
                        className="input-field font-mono font-bold pl-10"
                        value={form.numero_expediente}
                        onChange={e => setForm(f => ({...f, numero_expediente: e.target.value}))}
                        placeholder="GCT2026…"
                        required
                      />
                      <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gecotex-ink-muted" />
                    </div>
                    <p className="text-[11px] text-gecotex-ink-muted">Código único del expediente (ej. GCT2026-001)</p>
                  </div>
                  <div className="space-y-1">
                    <label className="label">Cliente <span className="text-gecotex-red">*</span></label>
                    <div className="relative">
                      <input
                        className="input-field pl-10"
                        value={form.cliente_nombre}
                        onChange={e => setForm(f => ({...f, cliente_nombre: e.target.value}))}
                        placeholder="Nombre del cliente o empresa"
                        required
                      />
                      <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gecotex-ink-muted" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="label">Tipo de tráfico</label>
                    <select className="input-field" value={form.tipo_trafico} onChange={e => setForm(f => ({...f, tipo_trafico: e.target.value, tipo_dua_id: ''}))}>
                      <option value="exportacion">Exportación — salida de mercancía al exterior</option>
                      <option value="importacion">Importación — entrada de mercancía en España</option>
                      <option value="regimen_especial">Régimen especial — tránsito u otros</option>
                    </select>
                  </div>
                  {isCoordinador && (
                    <div className="space-y-1">
                      <label className="label">Operario responsable</label>
                      <select className="input-field" value={form.operario_id} onChange={e => setForm(f => ({...f, operario_id: e.target.value}))}>
                        {operarios.map(op => <option key={op.id} value={op.id}>{op.nombre} {op.apellidos}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </Section>

              <Section number="2" title="Tipo de DUA" subtitle="Selecciona el tipo de Documento Único Aduanero (DUA) que corresponde a esta operación — obligatorio *">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tiposFiltrados.map(t => {
                    const active = +form.tipo_dua_id === t.id
                    return (
                      <div 
                        key={t.id}
                        onClick={() => setForm(f => ({...f, tipo_dua_id: t.id}))}
                        className={clsx(
                          'cursor-pointer border-2 rounded-xl p-4 transition-all flex items-start gap-3',
                          active ? 'border-gecotex-blue bg-gecotex-blue-light' : 'border-gecotex-border bg-white hover:border-gecotex-ink-muted'
                        )}
                      >
                        <div className={clsx(
                          'w-4.5 h-4.5 rounded-full border-2 mt-1 flex items-center justify-center shrink-0',
                          active ? 'border-gecotex-blue bg-white' : 'border-gecotex-ink-muted bg-white'
                        )}>
                          {active && <div className="w-2.5 h-2.5 rounded-full bg-gecotex-blue" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[13.5px] font-bold text-gecotex-ink truncate pr-2">{t.nombre}</span>
                            <span className="text-[11.5px] font-bold text-gecotex-blue font-mono whitespace-nowrap">{(t.up_base ?? 0).toFixed(1)} UP</span>
                          </div>
                          <p className="text-[11.5px] text-gecotex-ink-sub line-clamp-1">{t.descripcion || 'Operación estándar'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>

              <Section number="3" title="Complejidad" subtitle="Partidas e incrementadores que afectan al cálculo de UPs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  <div className="md:col-span-4 space-y-4">
                    <div>
                      <label className="label flex items-center gap-1.5">
                        Partidas arancelarias
                        <Tooltip text="Número de líneas de productos distintos en la declaración DUA. Las partidas dentro del tramo base del tipo seleccionado no añaden coste extra. Cada partida adicional sobre ese mínimo suma +0.10 UP al expediente." />
                      </label>
                      <div className="flex items-center bg-gecotex-bg border border-gecotex-border rounded-lg overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => setForm(f => ({...f, num_partidas: Math.max(1, f.num_partidas - 1)}))}
                          className="w-12 h-11 flex items-center justify-center text-xl font-medium text-gecotex-ink-sub hover:bg-gecotex-border-soft transition-colors"
                        >
                          −
                        </button>
                        <div className="flex-1 text-center font-mono text-lg font-bold text-gecotex-ink border-x border-gecotex-border">
                          {form.num_partidas}
                        </div>
                        <button 
                          type="button"
                          onClick={() => setForm(f => ({...f, num_partidas: f.num_partidas + 1}))}
                          className="w-12 h-11 flex items-center justify-center text-xl font-medium text-gecotex-ink-sub hover:bg-gecotex-border-soft transition-colors"
                        >
                          +
                        </button>
                      </div>
                      {tipoDuaSeleccionado && (
                        <p className="text-[11px] text-gecotex-ink-muted mt-2 font-medium">
                          {form.num_partidas > tipoDuaSeleccionado.tramo_partidas_min 
                            ? `${form.num_partidas - tipoDuaSeleccionado.tramo_partidas_min} partidas extra sobre base (${tipoDuaSeleccionado.tramo_partidas_min})`
                            : `Dentro del tramo base (hasta ${tipoDuaSeleccionado.tramo_partidas_min})`
                          }
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="label flex items-center gap-1.5">
                        Canal de respuesta aduanera
                        <Tooltip text="Canal asignado por la aduana al procesar el DUA. Verde = despacho directo sin revisión. Naranja = revisión documental requerida. Rojo = inspección física de la mercancía." />
                      </label>
                      <select className="input-field" value={form.canal_respuesta} onChange={e => setForm(f => ({...f, canal_respuesta: e.target.value}))}>
                        <option value="pendiente">⬜ Pendiente — aún no asignado</option>
                        <option value="verde">🟢 Verde — despacho sin revisión</option>
                        <option value="naranja">🟠 Naranja — revisión documental</option>
                        <option value="rojo">🔴 Rojo — inspección física</option>
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-8">
                    <label className="label mb-1 flex items-center gap-1.5">
                      Incrementadores aplicables
                      <Tooltip text="Conceptos adicionales que aumentan la complejidad del expediente. Cada uno suma UPs extra al total. Selecciona todos los que apliquen a esta operación." />
                    </label>
                    <p className="text-[11px] text-gecotex-ink-muted mb-3">Marca los servicios adicionales prestados en esta tramitación</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {incrementadores.map(inc => {
                        const active = form.servicios_adicionales.includes(inc.id)
                        return (
                          <label 
                            key={inc.id} 
                            className={clsx(
                              'flex items-center gap-3 p-3 rounded-lg border-1.5 cursor-pointer transition-all',
                              active ? 'border-gecotex-blue bg-gecotex-blue-light shadow-sm' : 'border-gecotex-border bg-white hover:border-gecotex-ink-muted'
                            )}
                          >
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={active} 
                              onChange={() => toggleInc(inc.id)} 
                            />
                            <div className={clsx(
                              'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                              active ? 'bg-gecotex-blue border-gecotex-blue' : 'bg-white border-gecotex-ink-muted'
                            )}>
                              {active && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                <span className="text-[12.5px] font-bold text-gecotex-ink truncate pr-2">{inc.nombre}</span>
                                <span className="text-[10.5px] font-bold text-gecotex-blue font-mono">+{(inc.up_adicional ?? 0).toFixed(1)}</span>
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Section>

              <Section number="4" title="Fases del proceso" subtitle="Registra las fechas y horas de cada etapa de la tramitación aduanera (opcional, puedes actualizarlas después)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'fecha_recepcion_correo', label: 'Recepción correo', icon: Mail },
                    { key: 'fecha_apertura_dossier', label: 'Apertura dossier', icon: Folder },
                    { key: 'fecha_envio_aduana', label: 'Envío a aduana', icon: Send },
                    { key: 'fecha_levante', label: 'Levante / Respuesta', icon: CheckCircle2 },
                    { key: 'fecha_envio_facturacion', label: 'Envío a facturación', icon: Receipt },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="label flex items-center gap-1.5">
                        <f.icon size={14} className="text-gecotex-ink-muted" />
                        {f.label}
                      </label>
                      <input 
                        type="datetime-local" 
                        className={clsx(
                          "input-field text-[13px] font-medium",
                          !form[f.key] && "text-gecotex-ink-muted"
                        )} 
                        value={form[f.key]} 
                        onChange={e => setForm(prev => ({...prev, [f.key]: e.target.value}))} 
                      />
                    </div>
                  ))}
                </div>
              </Section>

              <div className="space-y-2">
                <label className="label">Notas y observaciones</label>
                <textarea 
                  className="input-field resize-none h-24" 
                  value={form.notas} 
                  onChange={e => setForm(f => ({...f, notas: e.target.value}))} 
                  placeholder="Detalles adicionales sobre la tramitación..." 
                />
              </div>
            </form>
          </div>
        </div>

        {/* Right Sidebar: UP & Price Preview */}
        <div className="w-[380px] bg-white border-l border-gecotex-border flex flex-col flex-shrink-0 animate-fade-in">
          <div className="p-6 border-b border-gecotex-border-soft flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gecotex-blue" />
              <span className="text-[13px] font-bold text-gecotex-ink tracking-tight">Cálculo de UPs</span>
            </div>
            <span className="bg-gecotex-green-soft text-gecotex-green text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-gecotex-green animate-pulse" />
              En tiempo real
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Productivity Total */}
            <div className="p-6 bg-gradient-to-b from-[#F4F8FC] to-white">
              <p className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-3">Productividad estimada</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-6xl font-black text-gecotex-navy tracking-tighter font-mono leading-none">{upPreview.toFixed(2)}</span>
                <span className="text-[15px] font-bold text-gecotex-ink-sub">UP</span>
              </div>
              {tipoDuaSeleccionado && (
                <p className="text-[12.5px] font-bold text-gecotex-green flex items-center gap-1 mt-3">
                  <ChevronRight size={14} className="-rotate-90" />
                  +{(upPreview - tipoDuaSeleccionado.up_base).toFixed(2)} sobre base ({tipoDuaSeleccionado.up_base})
                </p>
              )}
            </div>

            {/* Economic Total */}
            <div className="p-6 border-y border-gecotex-border-soft bg-white">
              <p className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-3">Valor de facturación</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-gecotex-blue tracking-tighter font-mono leading-none">{valorPreview.toFixed(2)}€</span>
                <span className="text-[14px] font-bold text-gecotex-ink-sub uppercase tracking-wider text-sm">Eur</span>
              </div>
              <p className="text-[11.5px] text-gecotex-ink-muted mt-3 font-medium italic">Tarifas Gecotex v2025</p>
            </div>

            {/* Breakdown List */}
            <div className="p-6">
              <h3 className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-4">Desglose de cálculo</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-gecotex-ink-sub">DUA {tipoDuaSeleccionado?.codigo || '(Base)'}</span>
                  <div className="text-right">
                    <p className="font-bold text-gecotex-ink">{(tipoDuaSeleccionado?.up_base ?? 0).toFixed(2)} UP</p>
                    <p className="text-[11px] text-gecotex-ink-muted">{(tipoDuaSeleccionado?.precio_unitario ?? 0).toFixed(2)}€</p>
                  </div>
                </div>
                
                {form.num_partidas > (tipoDuaSeleccionado?.tramo_partidas_min || 0) && (
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-gecotex-ink-sub">Partidas adicionales ({form.num_partidas - (tipoDuaSeleccionado?.tramo_partidas_min ?? 0)})</span>
                    <div className="text-right">
                      <p className="font-bold text-gecotex-ink">+{( (form.num_partidas - (tipoDuaSeleccionado?.tramo_partidas_min ?? 0)) * 0.10 ).toFixed(2)} UP</p>
                      <p className="text-[11px] text-gecotex-ink-muted">+{( (form.num_partidas - (tipoDuaSeleccionado?.tramo_partidas_min ?? 0)) * (tipoDuaSeleccionado?.precio_partida_adicional ?? 0) ).toFixed(2)}€</p>
                    </div>
                  </div>
                )}

                {incsSeleccionados.map(inc => (
                  <div key={inc.id} className="flex justify-between items-center text-[13px]">
                    <span className="text-gecotex-ink-sub">{inc.nombre}</span>
                    <div className="text-right">
                      <p className="font-bold text-gecotex-ink">+{(inc.up_adicional ?? 0).toFixed(2)} UP</p>
                      <p className="text-[11px] text-gecotex-ink-muted">+{(inc.precio_unitario ?? 0).toFixed(2)}€</p>
                    </div>
                  </div>
                ))}

                <div className="pt-4 mt-2 border-t border-dashed border-gecotex-border flex items-center justify-between bg-gecotex-navy rounded-xl p-4 text-white">
                   <div>
                     <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Total expediente</p>
                     <p className="text-xs text-white/70">Confirmado al finalizar</p>
                   </div>
                   <div className="text-right">
                     <p className="text-2xl font-black font-mono">{upPreview.toFixed(2)} UP</p>
                     <p className="text-sm font-bold text-gecotex-blue-light">{valorPreview.toFixed(2)}€</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-6 border-t border-gecotex-border-soft bg-gecotex-bg">
            <div className="flex gap-3">
              <Info size={16} className="text-gecotex-blue shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-gecotex-ink-sub leading-relaxed">
                Las UPs se confirman cuando el expediente alcance la fase de <span className="font-bold text-gecotex-ink">Levante</span> con respuesta aduanera definitiva.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

