import { AlertTriangle, X } from 'lucide-react'

export default function ModalConfirm({ isOpen, onClose, onConfirm, titulo, mensaje, loading, btnLabel = 'Confirmar', btnDanger = true }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-semaforo-rojo-light rounded-xl">
            <AlertTriangle className="text-semaforo-rojo" size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{titulo}</h3>
            <p className="text-sm text-gray-600 mt-1">{mensaje}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className={btnDanger ? 'btn-danger text-sm' : 'btn-primary text-sm'}>
            {loading ? 'Procesando...' : btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
