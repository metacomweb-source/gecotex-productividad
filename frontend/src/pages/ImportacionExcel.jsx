import { useState } from 'react'
import { importacionApi } from '../api/client'
import { Upload, ChevronRight, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const CAMPOS_SISTEMA = ['numero_expediente', 'fecha_apertura_dossier', 'fecha_levante', 'operario', 'tipo_trafico', 'canal_respuesta', 'cliente_nombre', 'num_partidas']
const CAMPOS_LABELS = { numero_expediente: 'Nº Expediente', fecha_apertura_dossier: 'Fecha apertura', fecha_levante: 'Fecha levante', operario: 'Operario', tipo_trafico: 'Tipo tráfico', canal_respuesta: 'Canal', cliente_nombre: 'Cliente', num_partidas: 'Nº partidas' }

export default function ImportacionExcel() {
  const [paso, setPaso] = useState(1)
  const [preview, setPreview] = useState(null)
  const [mapeo, setMapeo] = useState({})
  const [accion, setAccion] = useState('ignorar')
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { toast.error('Solo se aceptan .xlsx y .xls'); return }
    setLoading(true)
    try {
      const r = await importacionApi.preview(file)
      setPreview(r.data)
      setMapeo(r.data.mapeo_sugerido || {})
      setPaso(2)
    } catch (err) { toast.error(err.response?.data?.detail || 'Error leyendo el archivo') }
    finally { setLoading(false) }
  }

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }
  const handleImportar = async () => {
    setLoading(true)
    try {
      const r = await importacionApi.ejecutar({ mapeo_columnas: mapeo, accion_duplicados: accion })
      setResultado(r.data)
      setPaso(4)
      toast.success(`Importados: ${r.data.importados}`)
    } catch (err) { toast.error(err.response?.data?.detail || 'Error en importación') }
    finally { setLoading(false) }
  }

  const pasos = ['Subir archivo', 'Mapear columnas', 'Validar', 'Resultado']

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold text-gecotex-primary">Importación desde Tarictrans</h1>

      {/* Steps */}
      <div className="flex items-center gap-0 mb-6">
        {pasos.map((p, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${paso > i+1 ? 'text-semaforo-verde' : paso === i+1 ? 'bg-gecotex-primary text-white' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${paso > i+1 ? 'bg-semaforo-verde text-white' : paso === i+1 ? 'bg-white text-gecotex-primary' : 'bg-gray-200 text-gray-400'}`}>
                {paso > i+1 ? <Check size={12} /> : i+1}
              </div>
              <span className="hidden sm:inline">{p}</span>
            </div>
            {i < pasos.length - 1 && <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Paso 1: Subir */}
      {paso === 1 && (
        <div
          className={`card border-2 border-dashed transition-colors cursor-pointer text-center py-12 ${dragging ? 'border-gecotex-primary bg-blue-50' : 'border-gray-300 hover:border-gecotex-primary hover:bg-gray-50'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input id="file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
          {loading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gecotex-primary mx-auto" />
          ) : (
            <>
              <Upload size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Arrastra el archivo Excel aquí o haz click para seleccionar</p>
              <p className="text-gray-400 text-sm mt-1">Acepta .xlsx y .xls · Máximo 10MB</p>
            </>
          )}
        </div>
      )}

      {/* Paso 2: Mapeo */}
      {paso === 2 && preview && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Mapeo de columnas</h2>
            <p className="text-xs text-gray-500 mb-3">El sistema ha detectado {preview.columnas_detectadas.length} columnas y autodetectado el mapeo. Ajusta si es necesario.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAMPOS_SISTEMA.map(campo => (
                <div key={campo} className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-36 flex-shrink-0">{CAMPOS_LABELS[campo]}:</label>
                  <select
                    className="input-field text-sm flex-1"
                    value={mapeo[campo] || ''}
                    onChange={e => setMapeo(m => ({...m, [campo]: e.target.value || null}))}
                  >
                    <option value="">Sin mapear</option>
                    {preview.columnas_detectadas.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="card p-0 overflow-hidden">
            <div className="p-3 border-b border-gray-100 text-xs font-medium text-gray-600">Vista previa (primeras {preview.preview_filas.length} filas)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr>{preview.columnas_detectadas.slice(0,8).map(c => <th key={c} className="table-header">{c}</th>)}</tr></thead>
                <tbody>
                  {preview.preview_filas.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {preview.columnas_detectadas.slice(0,8).map(c => <td key={c} className="table-cell truncate max-w-24">{String(row[c] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="label">¿Qué hacer con duplicados?</label>
              <select className="input-field w-auto" value={accion} onChange={e => setAccion(e.target.value)}>
                <option value="ignorar">Ignorar (no actualizar)</option>
                <option value="actualizar">Actualizar los existentes</option>
              </select>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setPaso(1)} className="btn-secondary text-sm">Atrás</button>
              <button onClick={() => setPaso(3)} className="btn-primary text-sm">Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Validar */}
      {paso === 3 && preview && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Resumen de importación</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-gecotex-primary">{preview.total_filas}</p><p className="text-xs text-gray-500">Filas detectadas</p></div>
              <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-gecotex-primary">{Object.values(mapeo).filter(Boolean).length}</p><p className="text-xs text-gray-500">Columnas mapeadas</p></div>
              <div className="p-3 bg-semaforo-naranja-light rounded-xl"><p className="text-2xl font-bold text-semaforo-naranja capitalize">{accion}</p><p className="text-xs text-semaforo-naranja">Acción duplicados</p></div>
              <div className="p-3 bg-semaforo-verde-light rounded-xl"><p className="text-2xl font-bold text-semaforo-verde">Listo</p><p className="text-xs text-semaforo-verde">Para importar</p></div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setPaso(2)} className="btn-secondary">Atrás</button>
            <button onClick={handleImportar} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Importando...</> : 'Importar ahora'}
            </button>
          </div>
        </div>
      )}

      {/* Paso 4: Resultado */}
      {paso === 4 && resultado && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Resultado de la importación</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-semaforo-verde-light rounded-xl"><p className="text-3xl font-black text-semaforo-verde">{resultado.importados}</p><p className="text-xs text-semaforo-verde">Importados</p></div>
            <div className="p-3 bg-blue-50 rounded-xl"><p className="text-3xl font-black text-gecotex-primary">{resultado.actualizados}</p><p className="text-xs text-gecotex-primary">Actualizados</p></div>
            <div className="p-3 bg-gray-100 rounded-xl"><p className="text-3xl font-black text-gray-500">{resultado.ignorados}</p><p className="text-xs text-gray-500">Ignorados</p></div>
            <div className="p-3 bg-semaforo-rojo-light rounded-xl"><p className="text-3xl font-black text-semaforo-rojo">{resultado.con_error}</p><p className="text-xs text-semaforo-rojo">Con error</p></div>
          </div>
          {resultado.errores?.length > 0 && (
            <div className="bg-semaforo-rojo-light rounded-xl p-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-semaforo-rojo mb-2">Errores ({resultado.errores.length}):</p>
              {resultado.errores.map((e, i) => (
                <p key={i} className="text-xs text-semaforo-rojo">Fila {e.fila}: {e.error}</p>
              ))}
            </div>
          )}
          <button onClick={() => { setPaso(1); setPreview(null); setResultado(null) }} className="btn-primary text-sm">Nueva importación</button>
        </div>
      )}
    </div>
  )
}
