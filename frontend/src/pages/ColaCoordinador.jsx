import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ListTodo, LayoutGrid, Table2, Plus, GripVertical, Clock, User,
  AlertTriangle, Pencil, Trash2, X, Check, ChevronDown,
} from 'lucide-react'
import { colaApi, empleadosDashboardApi } from '../api/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const PRIORIDAD_LABELS = {
  urgente:      { label: 'Urgente',       cls: 'bg-red-100 text-red-700' },
  normal:       { label: 'Normal',        cls: 'bg-amber-100 text-amber-700' },
  puede_esperar:{ label: 'Puede esperar', cls: 'bg-slate-100 text-slate-600' },
}

const ESTADO_LABELS = {
  pendiente:    { label: 'Pendiente',  cls: 'bg-blue-100 text-blue-700' },
  en_curso:     { label: 'En curso',   cls: 'bg-green-100 text-green-700' },
  completado:   { label: 'Completado', cls: 'bg-gray-100 text-gray-500' },
  cancelado:    { label: 'Cancelado',  cls: 'bg-red-50 text-red-400' },
}

function PrioridadBadge({ valor }) {
  const p = PRIORIDAD_LABELS[valor] || PRIORIDAD_LABELS.normal
  return <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${p.cls}`}>{p.label}</span>
}

function EstadoBadge({ valor }) {
  const e = ESTADO_LABELS[valor] || ESTADO_LABELS.pendiente
  return <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${e.cls}`}>{e.label}</span>
}

// ── Card sortable ──────────────────────────────────────────────────────────────

function ColaCard({ item, operarios, onEdit, onDelete, onAsignar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const [showAsignar, setShowAsignar] = useState(false)
  const [asignadoId, setAsignadoId] = useState(item.asignado_a || '')

  const handleAsignar = async () => {
    if (!asignadoId) return
    await onAsignar(item.id, parseInt(asignadoId))
    setShowAsignar(false)
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gecotex-border rounded-lg p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 cursor-grab text-gecotex-ink-sub hover:text-gecotex-ink">
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PrioridadBadge valor={item.prioridad} />
            <EstadoBadge valor={item.estado} />
          </div>
          <p className="text-sm font-medium text-gecotex-ink leading-snug">{item.descripcion}</p>
          {item.cliente_nombre && (
            <p className="text-xs text-gecotex-ink-sub mt-0.5">{item.cliente_nombre}</p>
          )}
          {item.numero_expediente_tari && (
            <p className="text-xs font-mono text-gecotex-blue mt-0.5">{item.numero_expediente_tari}</p>
          )}
          {item.fecha_limite && (
            <div className="flex items-center gap-1 text-xs text-gecotex-ink-sub mt-1">
              <Clock size={11} />
              {format(new Date(item.fecha_limite), "d MMM yyyy", { locale: es })}
            </div>
          )}
          {/* Asignar inline */}
          {showAsignar ? (
            <div className="flex items-center gap-1 mt-2">
              <select
                value={asignadoId}
                onChange={e => setAsignadoId(e.target.value)}
                className="text-xs border border-gecotex-border rounded px-1 py-0.5 flex-1"
              >
                <option value="">Seleccionar…</option>
                {operarios.map(op => (
                  <option key={op.id} value={op.id}>{op.nombre} {op.apellidos}</option>
                ))}
              </select>
              <button onClick={handleAsignar} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={13} /></button>
              <button onClick={() => setShowAsignar(false)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X size={13} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              {!item.asignado_a && (
                <button onClick={() => setShowAsignar(true)} className="text-xs text-gecotex-blue hover:underline flex items-center gap-1">
                  <User size={11} /> Asignar
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={() => onEdit(item)} className="p-1 text-gecotex-ink-sub hover:text-gecotex-blue hover:bg-blue-50 rounded">
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(item)} className="p-1 text-gecotex-ink-sub hover:text-red-500 hover:bg-red-50 rounded">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Form Modal ────────────────────────────────────────────────────────────────

function ColaFormModal({ item, operarios, onSave, onClose }) {
  const [form, setForm] = useState({
    descripcion: item?.descripcion || '',
    prioridad: item?.prioridad || 'normal',
    cliente_nombre: item?.cliente_nombre || '',
    numero_expediente_tari: item?.numero_expediente_tari || '',
    tipo_trafico: item?.tipo_trafico || '',
    asignado_a: item?.asignado_a || '',
    fecha_limite: item?.fecha_limite ? item.fecha_limite.slice(0, 16) : '',
    notas_coordinador: item?.notas_coordinador || '',
    sede: item?.sede || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descripcion.trim()) return
    setLoading(true)
    try {
      const payload = { ...form }
      if (payload.asignado_a) payload.asignado_a = parseInt(payload.asignado_a)
      else delete payload.asignado_a
      if (!payload.fecha_limite) delete payload.fecha_limite
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
      await onSave(payload)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gecotex-primary">{item ? 'Editar tarea' : 'Nueva tarea'}</h3>
          <button onClick={onClose} className="p-1 text-gecotex-ink-sub hover:text-gecotex-ink"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gecotex-ink-sub mb-1">Descripción *</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full border border-gecotex-border rounded-lg px-3 py-2 text-sm resize-none"
              rows={2}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gecotex-ink-sub mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))} className="w-full border border-gecotex-border rounded-lg px-3 py-2 text-sm">
                <option value="urgente">Urgente</option>
                <option value="normal">Normal</option>
                <option value="puede_esperar">Puede esperar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gecotex-ink-sub mb-1">Asignar a</label>
              <select value={form.asignado_a} onChange={e => setForm(f => ({ ...f, asignado_a: e.target.value }))} className="w-full border border-gecotex-border rounded-lg px-3 py-2 text-sm">
                <option value="">Pool general</option>
                {operarios.map(op => <option key={op.id} value={op.id}>{op.nombre} {op.apellidos}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gecotex-ink-sub mb-1">Cliente</label>
              <input value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))} className="w-full border border-gecotex-border rounded-lg px-3 py-2 text-sm" placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gecotex-ink-sub mb-1">Nº expediente Tari</label>
              <input value={form.numero_expediente_tari} onChange={e => setForm(f => ({ ...f, numero_expediente_tari: e.target.value }))} className="w-full border border-gecotex-border rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gecotex-ink-sub mb-1">Fecha límite</label>
              <input type="datetime-local" value={form.fecha_limite} onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))} className="w-full border border-gecotex-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gecotex-ink-sub mb-1">Tipo tráfico</label>
              <select value={form.tipo_trafico} onChange={e => setForm(f => ({ ...f, tipo_trafico: e.target.value }))} className="w-full border border-gecotex-border rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                <option value="exportacion">Exportación</option>
                <option value="importacion">Importación</option>
                <option value="regimen_especial">Régimen especial</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gecotex-ink-sub mb-1">Notas coordinador</label>
            <textarea value={form.notas_coordinador} onChange={e => setForm(f => ({ ...f, notas_coordinador: e.target.value }))} className="w-full border border-gecotex-border rounded-lg px-3 py-2 text-sm resize-none" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-sm">
              {loading ? 'Guardando…' : item ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ColaCoordinador() {
  const [items, setItems] = useState([])
  const [operarios, setOperarios] = useState([])
  const [vista, setVista] = useState('kanban')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [sortKey, setSortKey] = useState('orden')
  const [sortDir, setSortDir] = useState('asc')
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const cargar = useCallback(async () => {
    try {
      const [cola, operariosData] = await Promise.all([
        colaApi.listar(),
        empleadosDashboardApi.listaOperarios(),
      ])
      setItems(cola.data)
      setOperarios(operariosData.data)
    } catch {
      toast.error('Error cargando la cola')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const pool = useMemo(() => items.filter(i => !i.asignado_a), [items])
  const porOperario = useMemo(() => {
    const map = {}
    items.filter(i => i.asignado_a).forEach(i => {
      if (!map[i.asignado_a]) map[i.asignado_a] = []
      map[i.asignado_a].push(i)
    })
    return map
  }, [items])

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const newItems = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({ ...it, orden: idx }))
    setItems(newItems)
    try {
      await colaApi.reordenar(newItems.map(i => ({ id: i.id, orden: i.orden })))
    } catch {
      toast.error('Error guardando el orden')
      cargar()
    }
  }

  const handleGuardar = async (payload) => {
    try {
      if (editingItem) {
        await colaApi.actualizar(editingItem.id, payload)
        toast.success('Tarea actualizada')
      } else {
        await colaApi.crear(payload)
        toast.success('Tarea creada')
      }
      setShowForm(false)
      setEditingItem(null)
      cargar()
    } catch {
      toast.error('Error guardando')
    }
  }

  const handleEliminar = async (item) => {
    if (!confirm(`¿Cancelar tarea "${item.descripcion}"?`)) return
    try {
      await colaApi.eliminar(item.id)
      toast.success('Tarea cancelada')
      cargar()
    } catch {
      toast.error('Error')
    }
  }

  const handleAsignar = async (itemId, operarioId) => {
    try {
      await colaApi.asignar(itemId, { asignado_a: operarioId })
      toast.success('Tarea asignada')
      cargar()
    } catch {
      toast.error('Error al asignar')
    }
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
      if (sortKey === 'fecha_limite') {
        va = va ? new Date(va) : new Date(9e15)
        vb = vb ? new Date(vb) : new Date(9e15)
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [items, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const activeItem = activeId ? items.find(i => i.id === activeId) : null

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ListTodo size={24} className="text-gecotex-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gecotex-primary">Cola de trabajo</h1>
            <p className="text-sm text-gecotex-ink-sub">{items.length} tareas · {pool.length} sin asignar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gecotex-border overflow-hidden">
            <button onClick={() => setVista('kanban')} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${vista === 'kanban' ? 'bg-gecotex-primary text-white' : 'bg-white text-gecotex-ink hover:bg-gecotex-bg'}`}>
              <LayoutGrid size={14} /> Kanban
            </button>
            <button onClick={() => setVista('tabla')} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${vista === 'tabla' ? 'bg-gecotex-primary text-white' : 'bg-white text-gecotex-ink hover:bg-gecotex-bg'}`}>
              <Table2 size={14} /> Tabla
            </button>
          </div>
          <button onClick={() => { setEditingItem(null); setShowForm(true) }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Nueva tarea
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gecotex-ink-sub">Cargando…</div>
      ) : vista === 'kanban' ? (
        /* ── VISTA KANBAN ── */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Pool general */}
            <div className="flex-shrink-0 w-72">
              <div className="bg-gecotex-bg rounded-xl p-3">
                <h3 className="text-xs font-bold text-gecotex-ink-sub uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <User size={12} /> Pool general <span className="ml-auto font-mono">{pool.length}</span>
                </h3>
                <SortableContext items={pool.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {pool.length === 0 && <p className="text-xs text-gecotex-ink-sub text-center py-4">Sin tareas</p>}
                    {pool.map(item => (
                      <ColaCard
                        key={item.id}
                        item={item}
                        operarios={operarios}
                        onEdit={i => { setEditingItem(i); setShowForm(true) }}
                        onDelete={handleEliminar}
                        onAsignar={handleAsignar}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </div>

            {/* Columnas por operario */}
            {operarios.map(op => {
              const opItems = porOperario[op.id] || []
              return (
                <div key={op.id} className="flex-shrink-0 w-72">
                  <div className="bg-gecotex-bg rounded-xl p-3">
                    <h3 className="text-xs font-bold text-gecotex-ink-sub uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <User size={12} /> {op.nombre} {op.apellidos}
                      <span className="ml-auto font-mono">{opItems.length}</span>
                    </h3>
                    <SortableContext items={opItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {opItems.length === 0 && <p className="text-xs text-gecotex-ink-sub text-center py-4">Sin tareas</p>}
                        {opItems.map(item => (
                          <ColaCard
                            key={item.id}
                            item={item}
                            operarios={operarios}
                            onEdit={i => { setEditingItem(i); setShowForm(true) }}
                            onDelete={handleEliminar}
                            onAsignar={handleAsignar}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeItem && (
              <div className="bg-white border-2 border-gecotex-blue rounded-lg p-3 shadow-xl w-72 opacity-95">
                <PrioridadBadge valor={activeItem.prioridad} />
                <p className="text-sm font-medium mt-1">{activeItem.descripcion}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        /* ── VISTA TABLA ── */
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gecotex-border">
                {[
                  ['prioridad', 'Prioridad'],
                  ['descripcion', 'Descripción'],
                  ['cliente_nombre', 'Cliente'],
                  ['asignado_a_nombre', 'Asignado a'],
                  ['estado', 'Estado'],
                  ['fecha_limite', 'Fecha límite'],
                ].map(([key, label]) => (
                  <th key={key} className="text-left px-4 py-3 text-xs font-semibold text-gecotex-ink-sub cursor-pointer hover:text-gecotex-ink" onClick={() => toggleSort(key)}>
                    {label} {sortKey === key && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(item => (
                <tr key={item.id} className="border-b border-gecotex-border-soft hover:bg-gecotex-bg/50">
                  <td className="px-4 py-3"><PrioridadBadge valor={item.prioridad} /></td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium truncate">{item.descripcion}</p>
                    {item.numero_expediente_tari && <p className="text-xs font-mono text-gecotex-blue">{item.numero_expediente_tari}</p>}
                  </td>
                  <td className="px-4 py-3 text-gecotex-ink-sub">{item.cliente_nombre || '—'}</td>
                  <td className="px-4 py-3 text-gecotex-ink-sub">{item.asignado_a_nombre || <span className="text-amber-600 text-xs">Sin asignar</span>}</td>
                  <td className="px-4 py-3"><EstadoBadge valor={item.estado} /></td>
                  <td className="px-4 py-3 text-gecotex-ink-sub text-xs">
                    {item.fecha_limite ? format(new Date(item.fecha_limite), "d MMM yyyy", { locale: es }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingItem(item); setShowForm(true) }} className="p-1 text-gecotex-ink-sub hover:text-gecotex-blue rounded"><Pencil size={13} /></button>
                      <button onClick={() => handleEliminar(item)} className="p-1 text-gecotex-ink-sub hover:text-red-500 rounded"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedItems.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gecotex-ink-sub">Sin tareas en la cola</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ColaFormModal
          item={editingItem}
          operarios={operarios}
          onSave={handleGuardar}
          onClose={() => { setShowForm(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
