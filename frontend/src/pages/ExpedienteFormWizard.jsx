import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { expedientesApi, tiposDuaApi, incrementadoresApi, usuariosApi, clientesApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { calcularUP } from '../utils/calculos'
import { ArrowLeft, ArrowRight, Check, Package, Ship, RotateCcw, Sparkles, Plus, Minus, Save, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import ModalCronometro from '../components/ModalCronometro'
import { useCelebraciones } from '../hooks/useCelebraciones'

const TRAFICO_CONFIG = {
  exportacion: { label: 'Exportación', desc: 'Mercancía que sale al exterior', icon: ArrowRight, color: 'blue' },
  importacion: { label: 'Importación', desc: 'Mercancía que entra en España', icon: ArrowLeft, color: 'navy' },
  regimen_especial: { label: 'Régimen Especial', desc: 'Tránsito y otros regímenes', icon: RotateCcw, color: 'orange' },
}

const PARTIDAS_RAPIDAS = [
  { label: '1–4', value: 2 },
  { label: '5–10', value: 7 },
  { label: '11–20', value: 15 },
  { label: '+20', value: 25 },
]

const PASOS = ['Tipo de DUA', 'Detalles', 'Fechas y notas']

function Stepper({ pasoActual }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {PASOS.map((nombre, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all',
              i < pasoActual ? 'bg-gecotex-green border-gecotex-green text-white' :
              i === pasoActual ? 'bg-gecotex-blue border-gecotex-blue text-white' :
              'bg-white border-gecotex-border text-gecotex-ink-muted'
            )}>
              {i < pasoActual ? <Check size={14} /> : i + 1}
            </div>
            <span className={clsx(
              'text-[10.5px] font-semibold mt-1 whitespace-nowrap',
              i === pasoActual ? 'text-gecotex-blue' : 'text-gecotex-ink-muted'
            )}>{nombre}</span>
          </div>
          {i < PASOS.length - 1 && (
            <div className={clsx('w-16 h-0.5 mx-1 mb-4 transition-all', i < pasoActual ? 'bg-gecotex-green' : 'bg-gecotex-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function ExpedienteFormWizard() {
  const navigate = useNavigate()
  const { usuario, isCoordinador } = useAuth()
  const { celebrar } = useCelebraciones()

  const [paso, setPaso] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tiposDua, setTiposDua] = useState([])
  const [incrementadores, setIncrementadores] = useState([])
  const [operarios, setOperarios] = useState([])
  const [clientes, setClientes] = useState([])
  const [modalCronometro, setModalCronometro] = useState(null)

  const [form, setForm] = useState({
    tipo_trafico: '',
    tipo_dua_id: '',
    num_partidas: 1,
    numero_expediente: '',
    cliente_id: null,
    cliente_nombre: '',
    operario_id: usuario?.id || '',
    servicios_adicionales: [],
    canal_respuesta: 'pendiente',
    fecha_recepcion_correo: '',
    fecha_apertura_dossier: new Date().toISOString().slice(0, 16),
    fecha_envio_aduana: '',
    fecha_levante: '',
    fecha_envio_facturacion: '',
    notas: '',
  })

  useEffect(() => {
    Promise.all([
      tiposDuaApi.listar(),
      incrementadoresApi.listar(),
      isCoordinador ? usuariosApi.listar() : Promise.resolve({ data: [] }),
      clientesApi.listar(),
    ]).then(([tipos, incs, ops, clis]) => {
      setTiposDua(Array.isArray(tipos.data) ? tipos.data : [])
      setIncrementadores(Array.isArray(incs.data) ? incs.data.filter(i => i.activo) : [])
      setOperarios(Array.isArray(ops.data) ? ops.data.filter(u => u.rol === 'operario' || u.rol === 'coordinador') : [])
      setClientes(Array.isArray(clis.data) ? clis.data : [])
    }).catch(() => toast.error('Error cargando datos'))
  }, [isCoordinador])

  const tipoDuaSeleccionado = tiposDua.find(t => t.id === +form.tipo_dua_id)
  const incsSeleccionados = incrementadores.filter(i => form.servicios_adicionales.includes(i.id))
  const upPreview = calcularUP(tipoDuaSeleccionado, +form.num_partidas, incsSeleccionados)
  const tiposFiltrados = tiposDua.filter(t => !form.tipo_trafico || t.tipo_trafico === form.tipo_trafico)

  const toggleInc = (id) => setForm(f => ({
    ...f,
    servicios_adicionales: f.servicios_adicionales.includes(id)
      ? f.servicios_adicionales.filter(x => x !== id)
      : [...f.servicios_adicionales, id],
  }))

  const ahora = () => new Date().toISOString().slice(0, 16)

  const puedeAvanzar = () => {
    if (paso === 0) return form.tipo_trafico && form.tipo_dua_id
    if (paso === 1) return form.numero_expediente && form.cliente_id
    return true
  }

  const handleSubmit = async () => {
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
      const r = await expedientesApi.crear(payload)
      toast.success('Expediente creado correctamente')
      await celebrar('primer_expediente', { ups: upPreview })
      const enTramitacion = form.fecha_apertura_dossier && !form.fecha_levante
      if (enTramitacion) {
        setModalCronometro({ id: r.data.id, numero: form.numero_expediente })
      } else {
        navigate(`/expedientes/${r.data.id}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear el expediente')
    } finally {
      setLoading(false)
    }
  }

  if (modalCronometro) return (
    <ModalCronometro
      expedienteId={modalCronometro.id}
      numeroExpediente={modalCronometro.numero}
      onConfirm={() => navigate(`/expedientes/${modalCronometro.id}`)}
      onSkip={() => navigate(`/expedientes/${modalCronometro.id}`)}
    />
  )

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gecotex-bg rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gecotex-ink" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gecotex-ink">Nuevo expediente</h1>
          <p className="text-[12.5px] text-gecotex-ink-sub">Paso {paso + 1} de {PASOS.length}</p>
        </div>
      </div>

      <Stepper pasoActual={paso} />

      {/* PASO 0 — Tipo de DUA */}
      {paso === 0 && (
        <div className="space-y-5">
          <div>
            <p className="text-[13px] font-bold text-gecotex-ink mb-3">¿Qué tipo de tráfico es?</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(TRAFICO_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                const active = form.tipo_trafico === key
                return (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, tipo_trafico: key, tipo_dua_id: '' }))}
                    className={clsx(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                      active
                        ? 'border-gecotex-blue bg-gecotex-blue/5 shadow-sm'
                        : 'border-gecotex-border bg-white hover:border-gecotex-blue/50'
                    )}
                  >
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
                      active ? 'bg-gecotex-blue text-white' : 'bg-gecotex-bg text-gecotex-ink-muted')}>
                      <Icon size={20} />
                    </div>
                    <p className="text-[12.5px] font-bold text-gecotex-ink">{cfg.label}</p>
                    <p className="text-[10.5px] text-gecotex-ink-muted leading-tight">{cfg.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {form.tipo_trafico && (
            <div>
              <p className="text-[13px] font-bold text-gecotex-ink mb-3">¿Qué tipo de DUA?</p>
              <div className="grid grid-cols-1 gap-2">
                {tiposFiltrados.map(t => {
                  const active = +form.tipo_dua_id === t.id
                  const upBase = calcularUP(t, form.num_partidas, [])
                  return (
                    <button
                      key={t.id}
                      onClick={() => setForm(f => ({ ...f, tipo_dua_id: t.id }))}
                      className={clsx(
                        'flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left',
                        active
                          ? 'border-gecotex-blue bg-gecotex-blue/5'
                          : 'border-gecotex-border bg-white hover:border-gecotex-blue/40'
                      )}
                    >
                      <div>
                        <p className="text-[13px] font-bold text-gecotex-ink">{t.nombre}</p>
                        {t.descripcion && <p className="text-[11.5px] text-gecotex-ink-muted mt-0.5">{t.descripcion}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-[11px] text-gecotex-ink-muted">Valor base</p>
                        <p className="text-lg font-black text-gecotex-blue font-mono">{upBase.toFixed(1)} UP</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {form.tipo_dua_id && (
            <div>
              <p className="text-[13px] font-bold text-gecotex-ink mb-3">¿Cuántas partidas arancelarias?</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PARTIDAS_RAPIDAS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setForm(f => ({ ...f, num_partidas: p.value }))}
                    className={clsx(
                      'py-2.5 rounded-xl border-2 text-[13px] font-bold transition-all',
                      form.num_partidas === p.value
                        ? 'border-gecotex-blue bg-gecotex-blue text-white'
                        : 'border-gecotex-border bg-white text-gecotex-ink hover:border-gecotex-blue/50'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setForm(f => ({ ...f, num_partidas: Math.max(1, f.num_partidas - 1) }))}
                  className="w-9 h-9 rounded-xl border border-gecotex-border bg-white flex items-center justify-center hover:bg-gecotex-bg">
                  <Minus size={16} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-black font-mono text-gecotex-ink">{form.num_partidas}</span>
                  <span className="text-sm text-gecotex-ink-muted ml-1">partidas</span>
                </div>
                <button onClick={() => setForm(f => ({ ...f, num_partidas: f.num_partidas + 1 }))}
                  className="w-9 h-9 rounded-xl border border-gecotex-border bg-white flex items-center justify-center hover:bg-gecotex-bg">
                  <Plus size={16} />
                </button>
              </div>
              <div className="mt-3 bg-gecotex-blue/5 border border-gecotex-blue/20 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-gecotex-blue" />
                  <span className="text-[13px] font-semibold text-gecotex-ink">Este expediente vale</span>
                </div>
                <span className="text-xl font-black font-mono text-gecotex-blue">{upPreview.toFixed(2)} UPs</span>
              </div>

              {/* Fecha apertura — sello inmediato al abrir el dossier */}
              <div className="mt-4 bg-white rounded-xl border border-gecotex-border-soft p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-semibold text-gecotex-ink flex items-center gap-2">
                    <Calendar size={15} className="text-gecotex-blue" />
                    📂 Apertura del dossier
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, fecha_apertura_dossier: ahora() }))}
                    className="text-[11px] font-bold text-gecotex-blue hover:underline"
                  >
                    Ahora
                  </button>
                </div>
                <input
                  type="datetime-local"
                  className="input-field text-sm"
                  value={form.fecha_apertura_dossier}
                  onChange={e => setForm(f => ({ ...f, fecha_apertura_dossier: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* PASO 1 — Detalles */}
      {paso === 1 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="label">Número de expediente *</label>
              <input
                className="input-field font-mono font-bold"
                value={form.numero_expediente}
                onChange={e => setForm(f => ({ ...f, numero_expediente: e.target.value }))}
                placeholder="GCT2026-001"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="label">Cliente *</label>
              <select
                className="input-field"
                value={form.cliente_id || ''}
                onChange={e => {
                  const cli = clientes.find(c => c.id === +e.target.value)
                  setForm(f => ({ ...f, cliente_id: cli ? cli.id : null, cliente_nombre: cli ? cli.nombre : '' }))
                }}
              >
                <option value="">Selecciona un cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            {isCoordinador && (
              <div className="space-y-1">
                <label className="label">Operario responsable</label>
                <select className="input-field" value={form.operario_id} onChange={e => setForm(f => ({ ...f, operario_id: e.target.value }))}>
                  {operarios.map(op => <option key={op.id} value={op.id}>{op.nombre} {op.apellidos}</option>)}
                </select>
              </div>
            )}
          </div>

          {incrementadores.length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-gecotex-ink mb-3">Servicios adicionales</p>
              <div className="grid grid-cols-1 gap-2">
                {incrementadores.map(inc => {
                  const active = form.servicios_adicionales.includes(inc.id)
                  return (
                    <button
                      key={inc.id}
                      onClick={() => toggleInc(inc.id)}
                      className={clsx(
                        'flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left',
                        active
                          ? 'border-gecotex-green bg-gecotex-green/5'
                          : 'border-gecotex-border bg-white hover:border-gecotex-green/40'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center',
                          active ? 'bg-gecotex-green text-white' : 'bg-gecotex-bg text-gecotex-ink-muted')}>
                          <Check size={14} />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gecotex-ink">{inc.nombre}</p>
                          {inc.descripcion && <p className="text-[11px] text-gecotex-ink-muted">{inc.descripcion}</p>}
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-gecotex-green flex-shrink-0 ml-2">
                        +{inc.up_adicional.toFixed(1)} UP
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-gecotex-bg rounded-xl p-4 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gecotex-ink">Total UPs estimadas</span>
            <span className="text-xl font-black font-mono text-gecotex-blue">{upPreview.toFixed(2)} UP</span>
          </div>
        </div>
      )}

      {/* PASO 2 — Fechas y notas */}
      {paso === 2 && (
        <div className="space-y-5">
          <p className="text-[13px] text-gecotex-ink-sub">Registra los hitos de tramitación. Pulsa "Ahora" para usar la fecha y hora actuales.</p>
          <div className="space-y-3">
            {[
              { key: 'fecha_recepcion_correo', label: 'Recepción del correo', icon: '📧' },
              { key: 'fecha_envio_aduana', label: 'Envío a aduana', icon: '📤' },
              { key: 'fecha_levante', label: 'Levante', icon: '✅' },
              { key: 'fecha_envio_facturacion', label: 'Envío a facturación', icon: '🧾' },
            ].map(({ key, label, icon }) => (
              <div key={key} className="bg-white rounded-xl border border-gecotex-border-soft p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-semibold text-gecotex-ink">
                    {icon} {label}
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, [key]: ahora() }))}
                    className="text-[11px] font-bold text-gecotex-blue hover:underline"
                  >
                    Ahora
                  </button>
                </div>
                <input
                  type="datetime-local"
                  className="input-field text-sm"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <label className="label">Notas (opcional)</label>
            <textarea
              className="input-field h-20 resize-none"
              placeholder="Observaciones, incidencias, instrucciones especiales..."
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            />
          </div>
          <div className="bg-gecotex-bg rounded-xl p-4 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gecotex-ink">UPs totales</span>
            <span className="text-xl font-black font-mono text-gecotex-blue">{upPreview.toFixed(2)} UP</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-8">
        {paso > 0 && (
          <button
            onClick={() => setPaso(p => p - 1)}
            className="btn-secondary flex items-center gap-2 px-5 py-2.5"
          >
            <ArrowLeft size={16} /> Atrás
          </button>
        )}
        <div className="flex-1" />
        {paso < PASOS.length - 1 ? (
          <button
            onClick={() => setPaso(p => p + 1)}
            disabled={!puedeAvanzar()}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-40"
          >
            Siguiente <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-6 py-2.5"
          >
            <Save size={16} /> {loading ? 'Guardando...' : 'Guardar expediente'}
          </button>
        )}
      </div>
    </div>
  )
}
