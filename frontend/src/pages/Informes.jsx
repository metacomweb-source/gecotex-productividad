import { useState } from 'react'
import { informesApi } from '../api/client'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { nombreMes, descargarBlob } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function Informes() {
  const now = new Date()
  const [loading, setLoading] = useState(null)
  const [params, setParams] = useState({ año: now.getFullYear(), mes: now.getMonth() + 1 })

  const descargar = async (tipo, fn, filename) => {
    setLoading(tipo)
    try {
      const r = await fn(params)
      descargarBlob(r.data, filename)
      toast.success('Informe descargado')
    } catch { toast.error('Error al generar el informe') }
    finally { setLoading(null) }
  }

  const informes = [
    {
      id: 'productividad',
      titulo: 'Productividad mensual',
      descripcion: 'UPs producidas, Factor K y % bonus por operario. Incluye comparativa con mes anterior.',
      icon: FileSpreadsheet,
      color: 'bg-blue-50 text-gecotex-primary',
      fn: () => informesApi.productividad({ año: params.año, mes: params.mes }),
      filename: `productividad_${params.año}_${params.mes.toString().padStart(2,'0')}.xlsx`,
    },
    {
      id: 'expedientes',
      titulo: 'Expedientes del periodo',
      descripcion: 'Todos los expedientes con sus campos completos. Filtrable por operario, tipo, canal y fecha.',
      icon: FileSpreadsheet,
      color: 'bg-green-50 text-semaforo-verde',
      fn: () => informesApi.expedientes({ año: params.año, mes: params.mes }),
      filename: `expedientes_${params.año}_${params.mes.toString().padStart(2,'0')}.xlsx`,
    },
    {
      id: 'bonus',
      titulo: 'Tabla de bonus anual',
      descripcion: 'Factor K y % bonus de todos los operarios en todos los meses del año. Para entregar a RRHH.',
      icon: FileText,
      color: 'bg-purple-50 text-purple-600',
      fn: () => informesApi.bonus({ año: params.año }),
      filename: `bonus_${params.año}.xlsx`,
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold text-gecotex-primary">Informes y Exportación</h1>

      {/* Selector periodo */}
      <div className="card flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-600">Periodo:</span>
        <select className="input-field w-auto text-sm" value={params.mes} onChange={e => setParams(p => ({...p, mes: +e.target.value}))}>
          {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{nombreMes(i+1)}</option>)}
        </select>
        <select className="input-field w-auto text-sm" value={params.año} onChange={e => setParams(p => ({...p, año: +e.target.value}))}>
          {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm text-gray-500">{nombreMes(params.mes)} {params.año}</span>
      </div>

      {/* Cards de informes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {informes.map(inf => (
          <div key={inf.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${inf.color}`}>
                <inf.icon size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{inf.titulo}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{inf.descripcion}</p>
              </div>
            </div>
            <button
              onClick={() => descargar(inf.id, inf.fn, inf.filename)}
              disabled={loading === inf.id}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
            >
              {loading === inf.id ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Generando...</>
              ) : (
                <><Download size={15} /> Descargar Excel</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
