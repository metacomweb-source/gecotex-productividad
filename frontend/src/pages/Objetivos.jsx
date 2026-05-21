import { useEffect, useState } from 'react'
import { usuariosApi, objetivosApi } from '../api/client'
import { Copy, X, Save } from 'lucide-react'
import { nombreMes } from '../utils/formatters'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function Objetivos() {
  const now = new Date()
  const [año, setAño] = useState(now.getFullYear())
  const [operarios, setOperarios] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const meses = Array.from({ length: 12 }, (_, i) => i + 1)

  const loadData = async () => {
    const [opsRes, objRes] = await Promise.all([
      usuariosApi.listar(),
      objetivosApi.listar({ año }),
    ])
    setOperarios(opsRes.data.filter(u => u.rol === 'operario'))
    setObjetivos(objRes.data)
  }

  useEffect(() => { loadData() }, [año])

  const getObjetivo = (operario_id, mes) =>
    objetivos.find(o => o.operario_id === operario_id && o.mes === mes)

  const openModal = (operario, mes) => {
    const obj = getObjetivo(operario.id, mes) || {}
    setModal({
      operario,
      mes,
      objetivo_up: obj.objetivo_up ?? '',
      objetivo_tiempo_respuesta_horas: obj.objetivo_tiempo_respuesta_horas ?? '',
      objetivo_tasa_incidencia_max: obj.objetivo_tasa_incidencia_max ?? '',
      objetivo_tiempo_facturacion_horas: obj.objetivo_tiempo_facturacion_horas ?? '',
    })
  }

  const handleSave = async () => {
    const up = parseFloat(modal.objetivo_up)
    if (isNaN(up) || up <= 0) { toast.error('El objetivo UP debe ser mayor que 0'); return }
    setSaving(true)
    try {
      const toNum = v => (v !== '' && v !== null && v !== undefined && !isNaN(parseFloat(v))) ? parseFloat(v) : null
      await objetivosApi.crear({
        operario_id: modal.operario.id,
        año,
        mes: modal.mes,
        objetivo_up: up,
        objetivo_tiempo_respuesta_horas: toNum(modal.objetivo_tiempo_respuesta_horas),
        objetivo_tasa_incidencia_max: toNum(modal.objetivo_tasa_incidencia_max),
        objetivo_tiempo_facturacion_horas: toNum(modal.objetivo_tiempo_facturacion_horas),
      })
      await loadData()
      setModal(null)
      toast.success('Objetivo guardado')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleCopiarMes = async (mesFuente, mesDestino) => {
    const promises = operarios.map(op => {
      const obj = getObjetivo(op.id, mesFuente)
      if (!obj) return Promise.resolve()
      return objetivosApi.crear({
        operario_id: op.id,
        año,
        mes: mesDestino,
        objetivo_up: obj.objetivo_up,
        objetivo_tiempo_respuesta_horas: obj.objetivo_tiempo_respuesta_horas,
        objetivo_tasa_incidencia_max: obj.objetivo_tasa_incidencia_max,
        objetivo_tiempo_facturacion_horas: obj.objetivo_tiempo_facturacion_horas,
      })
    })
    await Promise.all(promises)
    await loadData()
    toast.success(`Objetivos de ${nombreMes(mesFuente)} copiados a ${nombreMes(mesDestino)}`)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gecotex-primary">Objetivos Mensuales</h1>
          <p className="text-sm text-gecotex-ink-sub mt-0.5">Haz clic en una celda para editar todos los objetivos del operario</p>
        </div>
        <select className="input-field w-auto" value={año} onChange={e => setAño(+e.target.value)}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-5 text-xs text-gecotex-ink-sub">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gecotex-green inline-block" /> Todos los objetivos configurados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gecotex-primary inline-block" /> Solo UP configurado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Sin configurar
        </span>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header sticky left-0 bg-gray-50 z-10 min-w-36">Operario</th>
                {meses.map(m => (
                  <th key={m} className="table-header text-center min-w-24">
                    <div>{nombreMes(m).slice(0, 3)}</div>
                    {m > 1 && (
                      <button
                        onClick={() => handleCopiarMes(m - 1, m)}
                        className="text-xs text-gecotex-primary hover:underline font-normal mt-0.5"
                        title={`Copiar de ${nombreMes(m - 1)}`}
                      >
                        <Copy size={10} className="inline" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {operarios.map(op => (
                <tr key={op.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium sticky left-0 bg-white z-10">
                    {op.nombre} {op.apellidos}
                  </td>
                  {meses.map(mes => {
                    const obj = getObjetivo(op.id, mes)
                    const tieneCalidad = obj && (
                      obj.objetivo_tiempo_respuesta_horas != null ||
                      obj.objetivo_tasa_incidencia_max != null ||
                      obj.objetivo_tiempo_facturacion_horas != null
                    )
                    const completo = obj && tieneCalidad
                    return (
                      <td key={mes} className="p-1">
                        <button
                          onClick={() => openModal(op, mes)}
                          className={clsx(
                            'w-full text-center px-2 py-1.5 rounded-lg transition-all duration-150',
                            completo
                              ? 'border border-gecotex-green/40 bg-gecotex-green/5 hover:bg-gecotex-green/10'
                              : obj
                                ? 'border border-gecotex-primary/20 hover:bg-gecotex-primary/10'
                                : 'border border-transparent hover:bg-gray-100'
                          )}
                        >
                          {obj ? (
                            <div className="space-y-1">
                              <div className={clsx(
                                'font-bold text-xs leading-none',
                                completo ? 'text-gecotex-green' : 'text-gecotex-primary'
                              )}>
                                {obj.objetivo_up.toFixed(0)} UP
                              </div>
                              <div className="flex justify-center gap-0.5">
                                {[
                                  obj.objetivo_tiempo_respuesta_horas,
                                  obj.objetivo_tasa_incidencia_max,
                                  obj.objetivo_tiempo_facturacion_horas,
                                ].map((v, i) => (
                                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${v != null ? 'bg-gecotex-green' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="p-3 text-xs text-gray-400 border-t border-gray-100">
          Los 3 puntos bajo el valor UP indican si están configurados: tiempo de respuesta · tasa de incidencia · tiempo de facturación
        </p>
      </div>

      {/* Modal de edición */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gecotex-ink text-lg leading-tight">Objetivos del mes</h2>
                <p className="text-sm text-gecotex-ink-sub mt-0.5">
                  {modal.operario.nombre} {modal.operario.apellidos} · {nombreMes(modal.mes)} {año}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                  Objetivo UP <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="input-field pr-12"
                    value={modal.objetivo_up}
                    onChange={e => setModal(p => ({ ...p, objetivo_up: e.target.value }))}
                    placeholder="Ej: 250"
                    min="0"
                    step="0.5"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">UP</span>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1">
                <hr className="flex-1 border-gray-100" />
                <span className="text-[11px] text-gecotex-ink-muted font-medium uppercase tracking-wide">Objetivos de calidad (opcionales)</span>
                <hr className="flex-1 border-gray-100" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                    Tiempo respuesta máx.
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="input-field pr-8"
                      value={modal.objetivo_tiempo_respuesta_horas}
                      onChange={e => setModal(p => ({ ...p, objetivo_tiempo_respuesta_horas: e.target.value }))}
                      placeholder="2"
                      min="0"
                      step="0.5"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">h</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                    Tasa incidencia máx.
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="input-field pr-8"
                      value={modal.objetivo_tasa_incidencia_max}
                      onChange={e => setModal(p => ({ ...p, objetivo_tasa_incidencia_max: e.target.value }))}
                      placeholder="15"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                  Tiempo facturación máx.
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="input-field pr-8"
                    value={modal.objetivo_tiempo_facturacion_horas}
                    onChange={e => setModal(p => ({ ...p, objetivo_tiempo_facturacion_horas: e.target.value }))}
                    placeholder="24"
                    min="0"
                    step="0.5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">h</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Guardar objetivos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
