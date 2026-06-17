import { useCronometro } from '../context/CronometroContext'
import { Timer, X, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

export default function ModalCronometro({ expedienteId, numeroExpediente, onConfirm, onSkip }) {
  const { sesionActiva, iniciar } = useCronometro()
  const cambiando = sesionActiva && sesionActiva.expediente_id !== expedienteId

  const handleConfirm = async () => {
    await iniciar(expedienteId, numeroExpediente)
    onConfirm?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 relative">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gecotex-blue/10 mx-auto mb-5">
          <Timer size={32} className="text-gecotex-blue" />
        </div>

        <h2 className="text-[17px] font-bold text-gecotex-ink text-center mb-2">
          ¿Iniciar el cronómetro?
        </h2>
        <p className="text-[13px] text-gecotex-ink-sub text-center mb-1">
          Expediente <span className="font-bold font-mono text-gecotex-navy">{numeroExpediente}</span>
        </p>
        <p className="text-[12px] text-gecotex-ink-muted text-center mb-6">
          Registrar el tiempo te ayuda a conocer tu tasa de ocupación real.
        </p>

        {cambiando && (
          <div className="flex items-start gap-2.5 bg-orange-50 border border-orange-200 rounded-xl p-3 mb-5">
            <AlertCircle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-orange-700">
              Hay una sesión activa en otro expediente. Al confirmar, se cerrará automáticamente.
            </p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          className="w-full btn-primary py-3 text-[14px] font-bold mb-3"
        >
          Sí, iniciar cronómetro
        </button>
        <button
          onClick={onSkip}
          className="w-full text-[12.5px] text-gecotex-ink-muted hover:text-gecotex-ink transition-colors py-1"
        >
          No, lo haré más tarde
        </button>
      </div>
    </div>
  )
}
