import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, X, Plus, Minus, Check, Sparkles, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react'
import { expedientesApi, tiposDuaApi, incrementadoresApi, clientesApi } from '../api/client'
import { calcularUP } from '../utils/calculos'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PARTIDAS_RAPIDAS = [
  { label: '1–4', value: 2 },
  { label: '5–10', value: 7 },
  { label: '11–20', value: 15 },
  { label: '+20', value: 25 },
]

const TRAFICO_CONFIG = {
  exportacion:    { label: 'Export.', icon: ArrowRight, key: 'E' },
  importacion:    { label: 'Import.', icon: ArrowLeft,  key: 'I' },
  regimen_especial:{ label: 'Rég. esp.', icon: RotateCcw, key: 'R' },
}

export default function RegistroRapidoModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [tiposDua, setTiposDua] = useState([])
  const [incrementadores, setIncrementadores] = useState([])
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clienteQuery, setClienteQuery] = useState('')
  const [showClienteList, setShowClienteList] = useState(false)
  const clienteRef = useRef(null)

  const formInicial = {
    tipo_trafico: '',
    tipo_dua_id: '',
    cliente_id: null,
    cliente_nombre: '',
    num_partidas: 2,
    servicios_adicionales: [],
    numero_expediente_tari: '',
  }
  const [form, setForm] = useState(formInicial)

  // Cargar catálogos una sola vez al montar
  useEffect(() => {
    if (!isOpen) return
    setCargando(true)
    Promise.all([
      tiposDuaApi.listar(),
      incrementadoresApi.listar(),
      clientesApi.listar(),
    ]).then(([tipos, incs, clis]) => {
      setTiposDua(Array.isArray(tipos.data) ? tipos.data : [])
      setIncrementadores(Array.isArray(incs.data) ? incs.data.filter(i => i.activo) : [])
      setClientes(Array.isArray(clis.data) ? clis.data : [])
    }).catch(() => {}).finally(() => setCargando(false))
  }, [isOpen])

  // Keyboard shortcuts globales dentro del modal
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)

      if (e.key === 'Escape') { onClose(); return }
      if (isInput) return

      if (e.key === 'e' || e.key === 'E') setForm(f => ({ ...f, tipo_trafico: 'exportacion' }))
      else if (e.key === 'i' || e.key === 'I') setForm(f => ({ ...f, tipo_trafico: 'importacion' }))
      else if (e.key === 'r' || e.key === 'R') setForm(f => ({ ...f, tipo_trafico: 'regimen_especial' }))
      else if (e.key === '1') setForm(f => ({ ...f, num_partidas: PARTIDAS_RAPIDAS[0].value }))
      else if (e.key === '2') setForm(f => ({ ...f, num_partidas: PARTIDAS_RAPIDAS[1].value }))
      else if (e.key === '3') setForm(f => ({ ...f, num_partidas: PARTIDAS_RAPIDAS[2].value }))
      else if (e.key === '4') setForm(f => ({ ...f, num_partidas: PARTIDAS_RAPIDAS[3].value }))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Cerrar dropdown cliente al clicar fuera
  useEffect(() => {
    const handler = (e) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target)) setShowClienteList(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const tipoDuaSeleccionado = tiposDua.find(t => t.id === +form.tipo_dua_id)
  const incsSeleccionados = incrementadores.filter(i => form.servicios_adicionales.includes(i.id))
  const upPreview = useMemo(
    () => tipoDuaSeleccionado ? calcularUP(tipoDuaSeleccionado, +form.num_partidas, incsSeleccionados) : null,
    [tipoDuaSeleccionado, form.num_partidas, incsSeleccionados]
  )

  const toggleInc = (id) => setForm(f => ({
    ...f,
    servicios_adicionales: f.servicios_adicionales.includes(id)
      ? f.servicios_adicionales.filter(i => i !== id)
      : [...f.servicios_adicionales, id],
  }))

  const clientesFiltrados = useMemo(() => {
    if (!clienteQuery.trim()) return clientes.slice(0, 8)
    const q = clienteQuery.toLowerCase()
    return clientes.filter(c => c.nombre.toLowerCase().includes(q)).slice(0, 8)
  }, [clientes, clienteQuery])

  const seleccionarCliente = (cli) => {
    setForm(f => ({ ...f, cliente_id: cli.id, cliente_nombre: cli.nombre }))
    setClienteQuery(cli.nombre)
    setShowClienteList(false)
  }

  const esValido = form.tipo_trafico && form.cliente_nombre.trim()

  const enviar = async (keepOpen = false) => {
    if (!esValido) return
    setLoading(true)
    try {
      const payload = {
        tipo_trafico: form.tipo_trafico,
        tipo_dua_id: form.tipo_dua_id ? parseInt(form.tipo_dua_id) : undefined,
        cliente_id: form.cliente_id || undefined,
        cliente_nombre: form.cliente_nombre,
        num_partidas: form.num_partidas,
        servicios_adicionales: form.servicios_adicionales,
        numero_expediente_tari: form.numero_expediente_tari || undefined,
      }
      const { data: exp } = await expedientesApi.rapido(payload)
      toast.success(
        <span>
          Expediente creado{' '}
          <button
            className="underline font-semibold"
            onClick={() => navigate(`/expedientes/${exp.id}`)}
          >
            Ver
          </button>
        </span>,
        { duration: 6000 }
      )
      if (keepOpen) {
        const trafico = form.tipo_trafico
        setForm({ ...formInicial, tipo_trafico: trafico })
        setClienteQuery('')
      } else {
        onClose()
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al crear el expediente')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gecotex-border bg-gecotex-bg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gecotex-blue/10 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-gecotex-blue" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gecotex-primary">Registro rápido</h2>
              <p className="text-[11px] text-gecotex-ink-sub">E/I/R · 1-4 partidas · Esc para cerrar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gecotex-ink-sub hover:text-gecotex-ink hover:bg-gecotex-border rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {cargando ? (
            <div className="text-center py-8 text-gecotex-ink-sub text-sm">Cargando catálogos…</div>
          ) : (
            <>
              {/* Tipo tráfico */}
              <div>
                <label className="block text-xs font-semibold text-gecotex-ink-sub mb-2">
                  Tipo de tráfico <span className="text-red-500">*</span>
                  <span className="ml-2 text-[10px] text-gecotex-ink-sub font-normal">(E / I / R)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TRAFICO_CONFIG).map(([val, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, tipo_trafico: val }))}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                          form.tipo_trafico === val
                            ? 'border-gecotex-blue bg-gecotex-blue/5 text-gecotex-blue'
                            : 'border-gecotex-border bg-white text-gecotex-ink hover:border-gecotex-blue/40'
                        )}
                      >
                        <Icon size={14} />
                        <span>{cfg.label}</span>
                        <span className="ml-auto text-[10px] text-gecotex-ink-sub font-mono">{cfg.key}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cliente */}
              <div ref={clienteRef}>
                <label className="block text-xs font-semibold text-gecotex-ink-sub mb-2">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={clienteQuery}
                    onChange={e => {
                      setClienteQuery(e.target.value)
                      setForm(f => ({ ...f, cliente_nombre: e.target.value, cliente_id: null }))
                      setShowClienteList(true)
                    }}
                    onFocus={() => setShowClienteList(true)}
                    placeholder="Buscar cliente…"
                    className="w-full border border-gecotex-border rounded-xl px-3 py-2 text-sm"
                  />
                  {showClienteList && clientesFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gecotex-border rounded-xl shadow-lg overflow-hidden">
                      {clientesFiltrados.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => seleccionarCliente(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gecotex-bg"
                        >
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Nº partidas */}
              <div>
                <label className="block text-xs font-semibold text-gecotex-ink-sub mb-2">
                  Nº partidas
                  <span className="ml-2 text-[10px] font-normal">(1-4 para selección rápida)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {PARTIDAS_RAPIDAS.map((p, idx) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, num_partidas: p.value }))}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                          form.num_partidas === p.value
                            ? 'border-gecotex-blue bg-gecotex-blue text-white'
                            : 'border-gecotex-border bg-white text-gecotex-ink hover:border-gecotex-blue/40'
                        )}
                        title={`Atajo: ${idx + 1}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center border border-gecotex-border rounded-lg overflow-hidden ml-auto">
                    <button type="button" onClick={() => setForm(f => ({ ...f, num_partidas: Math.max(1, f.num_partidas - 1) }))} className="px-2 py-1.5 hover:bg-gecotex-bg text-gecotex-ink-sub">
                      <Minus size={12} />
                    </button>
                    <span className="px-3 text-sm font-mono font-bold min-w-[3ch] text-center">{form.num_partidas}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, num_partidas: f.num_partidas + 1 }))} className="px-2 py-1.5 hover:bg-gecotex-bg text-gecotex-ink-sub">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tipo DUA + servicios en la misma fila */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gecotex-ink-sub mb-2">Tipo DUA</label>
                  <select
                    value={form.tipo_dua_id}
                    onChange={e => setForm(f => ({ ...f, tipo_dua_id: e.target.value }))}
                    className="w-full border border-gecotex-border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Sin especificar</option>
                    {tiposDua.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre} ({t.up_base}UP)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gecotex-ink-sub mb-2">Nº expediente Tari</label>
                  <input
                    type="text"
                    value={form.numero_expediente_tari}
                    onChange={e => setForm(f => ({ ...f, numero_expediente_tari: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full border border-gecotex-border rounded-xl px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Servicios adicionales */}
              {incrementadores.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gecotex-ink-sub mb-2">Servicios adicionales</label>
                  <div className="flex flex-wrap gap-2">
                    {incrementadores.map(inc => {
                      const activo = form.servicios_adicionales.includes(inc.id)
                      return (
                        <button
                          key={inc.id}
                          type="button"
                          onClick={() => toggleInc(inc.id)}
                          className={clsx(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                            activo
                              ? 'border-gecotex-green bg-gecotex-green/5 text-gecotex-green'
                              : 'border-gecotex-border bg-white text-gecotex-ink hover:border-gecotex-green/40'
                          )}
                        >
                          {activo && <Check size={11} />}
                          {inc.nombre}
                          <span className="text-[10px] opacity-70">+{inc.up_adicional.toFixed(1)}UP</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* UP Preview */}
              {upPreview !== null && (
                <div className="flex items-center gap-3 px-4 py-3 bg-gecotex-blue/5 border border-gecotex-blue/20 rounded-xl">
                  <Sparkles size={16} className="text-gecotex-blue flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gecotex-ink-sub font-semibold uppercase tracking-wide">Unidades ponderadas estimadas</p>
                    <p className="text-2xl font-black font-mono text-gecotex-blue leading-none">{upPreview.toFixed(2)} <span className="text-sm font-semibold">UPs</span></p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gecotex-border bg-gecotex-bg gap-3">
          <button
            type="button"
            onClick={() => enviar(true)}
            disabled={!esValido || loading}
            className="flex items-center gap-2 px-4 py-2 border border-gecotex-primary text-gecotex-primary text-sm font-semibold rounded-xl hover:bg-gecotex-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Crear y añadir otro
          </button>
          <button
            type="button"
            onClick={() => enviar(false)}
            disabled={!esValido || loading}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando…' : <><Check size={14} /> Crear expediente</>}
          </button>
        </div>
      </div>
    </div>
  )
}
