import { useEffect, useState } from 'react'
import { tiposDuaApi, incrementadoresApi } from '../api/client'
import { Plus, Edit2, CheckCircle, XCircle, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

function TipoDuaRow({ tipo, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(tipo)
  const handleSave = async () => {
    try { await tiposDuaApi.actualizar(tipo.id, form); onSave(); setEditing(false); toast.success('Guardado') }
    catch { toast.error('Error al guardar') }
  }
  if (!editing) return (
    <tr className="hover:bg-gray-50">
      <td className="table-cell font-mono text-xs font-bold text-gecotex-primary">{tipo.codigo}</td>
      <td className="table-cell">{tipo.nombre}</td>
      <td className="table-cell text-xs capitalize">{tipo.tipo_trafico?.replace('_',' ')}</td>
      <td className="table-cell text-center">{tipo.tramo_partidas_min}–{tipo.tramo_partidas_max ?? '∞'}</td>
      <td className="table-cell text-center font-bold text-gecotex-primary">{tipo.up_base}</td>
      <td className="table-cell text-center text-xs">{tipo.tiempo_estimado_min}–{tipo.tiempo_estimado_max} min</td>
      <td className="table-cell text-center">{tipo.activo ? <CheckCircle size={14} className="text-semaforo-verde mx-auto" /> : <XCircle size={14} className="text-gray-300 mx-auto" />}</td>
      <td className="table-cell text-center"><button onClick={() => setEditing(true)} className="p-1 hover:bg-gray-100 rounded"><Edit2 size={14} className="text-gray-400" /></button></td>
    </tr>
  )
  return (
    <tr className="bg-blue-50">
      <td className="table-cell font-mono text-xs">{tipo.codigo}</td>
      <td className="table-cell"><input className="input-field text-xs" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} /></td>
      <td className="table-cell"><select className="input-field text-xs" value={form.tipo_trafico} onChange={e => setForm(f => ({...f, tipo_trafico: e.target.value}))}><option value="exportacion">Exportación</option><option value="importacion">Importación</option><option value="regimen_especial">Régimen especial</option></select></td>
      <td className="table-cell"><div className="flex gap-1"><input type="number" className="input-field text-xs w-14" value={form.tramo_partidas_min} onChange={e => setForm(f => ({...f, tramo_partidas_min: +e.target.value}))} /><input type="number" className="input-field text-xs w-14" value={form.tramo_partidas_max || ''} onChange={e => setForm(f => ({...f, tramo_partidas_max: e.target.value ? +e.target.value : null}))} placeholder="∞" /></div></td>
      <td className="table-cell"><input type="number" step="0.1" className="input-field text-xs w-20" value={form.up_base} onChange={e => setForm(f => ({...f, up_base: +e.target.value}))} /></td>
      <td className="table-cell"><div className="flex gap-1"><input type="number" className="input-field text-xs w-16" value={form.tiempo_estimado_min} onChange={e => setForm(f => ({...f, tiempo_estimado_min: +e.target.value}))} /><input type="number" className="input-field text-xs w-16" value={form.tiempo_estimado_max} onChange={e => setForm(f => ({...f, tiempo_estimado_max: +e.target.value}))} /></div></td>
      <td className="table-cell text-center"><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({...f, activo: e.target.checked}))} /></td>
      <td className="table-cell"><div className="flex gap-1"><button onClick={handleSave} className="p-1 hover:bg-semaforo-verde-light rounded"><Save size={14} className="text-semaforo-verde" /></button><button onClick={() => setEditing(false)} className="p-1 hover:bg-gray-100 rounded"><X size={14} className="text-gray-400" /></button></div></td>
    </tr>
  )
}

function IncRow({ inc, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(inc)
  const handleSave = async () => {
    try { await incrementadoresApi.actualizar(inc.id, form); onSave(); setEditing(false); toast.success('Guardado') }
    catch { toast.error('Error') }
  }
  if (!editing) return (
    <tr className="hover:bg-gray-50">
      <td className="table-cell font-mono text-xs font-bold text-gecotex-primary">{inc.codigo}</td>
      <td className="table-cell">{inc.nombre}</td>
      <td className="table-cell text-center font-bold text-gecotex-primary">+{inc.up_adicional}</td>
      <td className="table-cell text-center">{inc.activo ? <CheckCircle size={14} className="text-semaforo-verde mx-auto" /> : <XCircle size={14} className="text-gray-300 mx-auto" />}</td>
      <td className="table-cell text-center"><button onClick={() => setEditing(true)} className="p-1 hover:bg-gray-100 rounded"><Edit2 size={14} className="text-gray-400" /></button></td>
    </tr>
  )
  return (
    <tr className="bg-blue-50">
      <td className="table-cell font-mono text-xs">{inc.codigo}</td>
      <td className="table-cell"><input className="input-field text-xs" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} /></td>
      <td className="table-cell"><input type="number" step="0.01" className="input-field text-xs w-20" value={form.up_adicional} onChange={e => setForm(f => ({...f, up_adicional: +e.target.value}))} /></td>
      <td className="table-cell text-center"><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({...f, activo: e.target.checked}))} /></td>
      <td className="table-cell"><div className="flex gap-1"><button onClick={handleSave} className="p-1 hover:bg-semaforo-verde-light rounded"><Save size={14} className="text-semaforo-verde" /></button><button onClick={() => setEditing(false)} className="p-1 hover:bg-gray-100 rounded"><X size={14} className="text-gray-400" /></button></div></td>
    </tr>
  )
}

export default function TablaMaestraDUAs() {
  const [tiposDua, setTiposDua] = useState([])
  const [incrementadores, setIncrementadores] = useState([])

  const load = () => {
    tiposDuaApi.listar().then(r => setTiposDua(r.data))
    incrementadoresApi.listar().then(r => setIncrementadores(r.data))
  }
  useEffect(load, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gecotex-primary">Tabla Maestra DUAs</h1>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Tipos de DUA</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{['Código','Nombre','Tráfico','Partidas','UP Base','Tiempo estimado','Activo',''].map(h => <th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>{tiposDua.map(t => <TipoDuaRow key={t.id} tipo={t} onSave={load} />)}</tbody>
          </table>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Incrementadores</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{['Código','Nombre','UP adicional','Activo',''].map(h => <th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>{incrementadores.map(i => <IncRow key={i.id} inc={i} onSave={load} />)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
