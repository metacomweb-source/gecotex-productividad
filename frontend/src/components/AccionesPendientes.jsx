import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { kpisApi } from '../api/client'
import { AlertTriangle, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const SEVERIDAD_CONFIG = {
  alta: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  media: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  baja: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
}

export default function AccionesPendientes() {
  const [acciones, setAcciones] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    kpisApi.accionesPendientes().then(r => setAcciones(r.data)).catch(() => setAcciones([]))
  }, [])

  if (acciones === null) return null

  if (acciones.length === 0) {
    return (
      <div className="bg-white rounded-[10px] border border-gecotex-border-soft shadow-gx-sm p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gecotex-green/10 flex items-center justify-center flex-shrink-0">
          <CheckCircle size={20} className="text-gecotex-green" />
        </div>
        <div>
          <p className="text-[13.5px] font-bold text-gecotex-ink">Todo en orden</p>
          <p className="text-[12px] text-gecotex-ink-sub">No hay acciones pendientes en este momento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[10px] border border-gecotex-border-soft shadow-gx-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gecotex-border-soft">
        <p className="text-[13.5px] font-bold text-gecotex-ink">
          Acciones pendientes
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-gecotex-red text-white text-[10px] font-black rounded-full">
            {acciones.length}
          </span>
        </p>
      </div>
      <div className="divide-y divide-gecotex-border-soft">
        {acciones.map((a, i) => {
          const cfg = SEVERIDAD_CONFIG[a.severidad] || SEVERIDAD_CONFIG.baja
          const Icon = cfg.icon
          return (
            <button
              key={i}
              onClick={() => navigate(a.link)}
              className={clsx(
                'w-full flex items-center gap-4 px-5 py-3.5 hover:brightness-95 transition-all text-left',
                cfg.bg
              )}
            >
              <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg, 'border', cfg.border)}>
                <Icon size={16} className={cfg.color} />
              </div>
              <p className="flex-1 text-[12.5px] font-semibold text-gecotex-ink leading-snug">
                {a.descripcion}
              </p>
              <ChevronRight size={14} className="text-gecotex-ink-muted flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
