import { Timer, Pause, Square, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCronometro } from '../context/CronometroContext'
import toast from 'react-hot-toast'

export default function Cronometro() {
  const { sesionActiva, segundos, pausar, finalizar, formatearTiempo } = useCronometro()
  const navigate = useNavigate()

  if (!sesionActiva) return null

  const handlePausar = async (e) => {
    e.stopPropagation()
    try { await pausar() } catch { toast.error('Error al pausar') }
  }

  const handleFinalizar = async (e) => {
    e.stopPropagation()
    try { await finalizar() } catch { toast.error('Error al finalizar') }
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-40 bg-gecotex-primary text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-gecotex-primary-light transition-colors animate-fade-in min-w-64"
      onClick={() => navigate(`/expedientes/${sesionActiva.expediente_id}`)}
    >
      <div className="p-2 bg-white/15 rounded-xl">
        <Timer size={20} className="animate-pulse-slow" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70 truncate">
          {sesionActiva.numero_expediente || `Exp. #${sesionActiva.expediente_id}`}
        </p>
        <p className="text-xl font-mono font-bold tracking-wider">{formatearTiempo(segundos)}</p>
      </div>
      <div className="flex gap-1">
        <button
          onClick={handlePausar}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          title="Pausar"
        >
          <Pause size={16} />
        </button>
        <button
          onClick={handleFinalizar}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          title="Finalizar"
        >
          <Square size={16} />
        </button>
        <ChevronRight size={16} className="self-center opacity-50" />
      </div>
    </div>
  )
}
