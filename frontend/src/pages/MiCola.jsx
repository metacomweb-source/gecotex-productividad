import { useState, useEffect, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Play, CheckCircle, Clock, AlertTriangle, User, Zap, ChevronRight } from 'lucide-react'
import { colaApi } from '../api/client'
import { useCronometro } from '../context/CronometroContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ModalConfirm from '../components/ModalConfirm'

const PRIORIDAD_LABELS = {
  urgente:      { label: 'Urgente',       cls: 'bg-red-100 text-red-700' },
  normal:       { label: 'Normal',        cls: 'bg-amber-100 text-amber-700' },
  puede_esperar:{ label: 'Puede esperar', cls: 'bg-slate-100 text-slate-600' },
}

function PrioridadBadge({ valor }) {
  const p = PRIORIDAD_LABELS[valor] || PRIORIDAD_LABELS.normal
  return <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${p.cls}`}>{p.label}</span>
}

function ItemCard({ item, compact = false, actions }) {
  return (
    <div className={`bg-white border border-gecotex-border rounded-xl ${compact ? 'p-3' : 'p-4'} shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PrioridadBadge valor={item.prioridad} />
            {item.fecha_limite && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gecotex-ink-sub">
                <Clock size={10} />
                {format(new Date(item.fecha_limite), "d MMM", { locale: es })}
              </span>
            )}
          </div>
          <p className={`font-medium text-gecotex-ink ${compact ? 'text-sm' : 'text-base'} leading-snug`}>
            {item.descripcion}
          </p>
          {item.cliente_nombre && (
            <p className="text-xs text-gecotex-ink-sub mt-0.5">{item.cliente_nombre}</p>
          )}
          {item.numero_expediente_tari && (
            <p className="text-xs font-mono text-gecotex-blue mt-0.5">{item.numero_expediente_tari}</p>
          )}
          {item.notas_coordinador && (
            <p className="text-xs text-gecotex-ink-sub mt-1 italic">"{item.notas_coordinador}"</p>
          )}
        </div>
        {actions && <div className="flex flex-col gap-1.5 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

export default function MiCola() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmModal, setConfirmModal] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const { usuario } = useAuth()
  const { sesionActiva, iniciar: iniciarCronometro } = useCronometro()
  const navigate = useNavigate()

  const cargar = useCallback(async () => {
    try {
      const { data } = await colaApi.mia()
      setItems(data)
    } catch {
      toast.error('Error cargando cola')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Separar items por estado
  const enCurso = items.filter(i => i.estado === 'en_curso')
  const pendientes = items.filter(i => i.estado === 'pendiente')

  // Pool general: se carga por separado
  const [pool, setPool] = useState([])
  useEffect(() => {
    colaApi.listar({ estado: 'pendiente' })
      .then(({ data }) => setPool(data.filter(i => !i.asignado_a)))
      .catch(() => {})
  }, [])

  const cambiarEstado = async (item, nuevoEstado, notas) => {
    setProcesando(true)
    try {
      await colaApi.estado(item.id, { estado: nuevoEstado, notas_operario: notas })
      toast.success(nuevoEstado === 'completado' ? '¡Tarea completada!' : 'Estado actualizado')
      cargar()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setProcesando(false)
      setConfirmModal(null)
    }
  }

  const marcarEnCurso = async (item) => {
    if (enCurso.length > 0) {
      setConfirmModal({
        tipo: 'en_curso',
        item,
        titulo: 'Cambiar trabajo actual',
        mensaje: `Ya tienes una tarea en curso: "${enCurso[0].descripcion}". ¿Quieres empezar esta en su lugar?`,
      })
      return
    }
    await cambiarEstado(item, 'en_curso')
    if (item.expediente_id && item.numero_expediente_tari) {
      iniciarCronometro(item.expediente_id, item.numero_expediente_tari).catch(() => {})
    }
  }

  const marcarCompletado = (item) => {
    setConfirmModal({
      tipo: 'completado',
      item,
      titulo: 'Marcar como completado',
      mensaje: `¿Has terminado la tarea "${item.descripcion}"?`,
    })
  }

  const tomarDelPool = async (item) => {
    try {
      await colaApi.tomar(item.id)
      toast.success('Tarea tomada')
      cargar()
      setPool(p => p.filter(i => i.id !== item.id))
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al tomar la tarea')
    }
  }

  const handleConfirm = async () => {
    const { tipo, item } = confirmModal
    if (tipo === 'en_curso') {
      await cambiarEstado(item, 'en_curso')
      if (item.expediente_id && item.numero_expediente_tari) {
        iniciarCronometro(item.expediente_id, item.numero_expediente_tari).catch(() => {})
      }
    } else if (tipo === 'completado') {
      await cambiarEstado(item, 'completado')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList size={24} className="text-gecotex-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gecotex-primary">Mi cola</h1>
          <p className="text-sm text-gecotex-ink-sub">{pendientes.length} pendientes · {enCurso.length} en curso</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gecotex-ink-sub">Cargando…</div>
      ) : (
        <>
          {/* ── TRABAJO ACTUAL ──────────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold text-gecotex-ink-sub uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Play size={12} className="text-green-600" /> Trabajo actual
            </h2>
            {enCurso.length === 0 ? (
              <div className="bg-gecotex-bg border border-dashed border-gecotex-border rounded-xl p-6 text-center text-gecotex-ink-sub text-sm">
                Ninguna tarea en curso. Marca una como "En curso" para empezar.
              </div>
            ) : (
              enCurso.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  actions={
                    <>
                      {item.expediente_id && (
                        <button
                          onClick={() => navigate(`/expedientes/${item.expediente_id}`)}
                          className="text-xs text-gecotex-blue hover:underline flex items-center gap-1"
                        >
                          Ver exp. <ChevronRight size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => marcarCompletado(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle size={13} /> Completar
                      </button>
                    </>
                  }
                />
              ))
            )}
          </section>

          {/* ── PRÓXIMOS TRABAJOS ────────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold text-gecotex-ink-sub uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock size={12} /> Próximos trabajos
            </h2>
            {pendientes.length === 0 ? (
              <p className="text-sm text-gecotex-ink-sub text-center py-4">Sin tareas asignadas</p>
            ) : (
              <div className="space-y-2">
                {pendientes.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    compact
                    actions={
                      <button
                        onClick={() => marcarEnCurso(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gecotex-primary text-white text-xs font-semibold rounded-lg hover:opacity-90"
                      >
                        <Play size={12} /> En curso
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── POOL GENERAL ────────────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold text-gecotex-ink-sub uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <User size={12} /> Pool general
              <span className="ml-1 text-gecotex-ink-sub font-normal normal-case text-xs">— tareas sin asignar que puedes tomar</span>
            </h2>
            {pool.length === 0 ? (
              <p className="text-sm text-gecotex-ink-sub text-center py-4">Pool vacío</p>
            ) : (
              <div className="space-y-2">
                {pool.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    compact
                    actions={
                      <button
                        onClick={() => tomarDelPool(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gecotex-primary text-gecotex-primary text-xs font-semibold rounded-lg hover:bg-gecotex-primary hover:text-white transition-colors"
                      >
                        <Zap size={12} /> Tomar
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ModalConfirm
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={handleConfirm}
        titulo={confirmModal?.titulo || ''}
        mensaje={confirmModal?.mensaje || ''}
        loading={procesando}
        btnLabel="Confirmar"
        btnDanger={false}
      />
    </div>
  )
}
