import { useState } from 'react'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Package, BarChart2, ClipboardCheck, ChevronRight, X } from 'lucide-react'
import clsx from 'clsx'

const PASOS_OPERARIO = [
  {
    icon: Package,
    titulo: '¡Bienvenido/a a GECOTEX Productividad!',
    desc: 'Esta aplicación te ayuda a registrar tu trabajo diario con expedientes de aduanas y ver cómo evolucionas.',
    tips: ['Registra cada expediente que tramites para acumular UPs', 'El cronómetro mide tu tiempo real en cada expediente', 'Tu dashboard muestra tu progreso hacia el objetivo mensual'],
  },
  {
    icon: BarChart2,
    titulo: 'Cómo funciona tu rendimiento',
    desc: 'Tu productividad se mide en Unidades Ponderadas (UPs). Cada tipo de DUA tiene un valor base que se ajusta según partidas e incrementadores.',
    tips: ['El Factor K = UPs producidas ÷ Objetivo mensual', 'K ≥ 1.0 significa que superas el objetivo', 'Los expedientes completados se cuentan automáticamente'],
  },
  {
    icon: ClipboardCheck,
    titulo: 'Evaluaciones semestrales',
    desc: 'Dos veces al año completarás una autoevaluación sobre calidad, trabajo en equipo y digitalización. La dirección también aportará su valoración.',
    tips: ['La autoevaluación no lleva más de 10 minutos', 'La puntuación final determina tu bonus semestral', 'Puedes ver tu progreso en "Mi Evaluación"'],
  },
]

const PASOS_DIRECTOR = [
  {
    icon: BarChart2,
    titulo: '¡Bienvenido/a, {nombre}!',
    desc: 'Tienes acceso al dashboard del equipo, las evaluaciones semestrales y la configuración del sistema de bonus.',
    tips: ['Dashboard del equipo → rendimiento global y ranking', 'Evaluaciones Bonus → evalúa a tu equipo', 'Informes → descarga datos en Excel'],
  },
  {
    icon: ClipboardCheck,
    titulo: 'Gestión de evaluaciones',
    desc: 'Cuando los operarios completen su autoevaluación, recibirás una notificación para añadir tu valoración de dirección.',
    tips: ['Revisa las áreas 2, 3 y 4 por cada empleado', 'Tu valoración tiene un peso del 70% en el resultado final', 'Puedes cerrar la evaluación para confirmar el bonus'],
  },
  {
    icon: Package,
    titulo: 'Todo listo',
    desc: 'Ya tienes acceso completo al sistema. Si tienes dudas, el administrador puede ajustar cualquier parámetro.',
    tips: ['Config. Bonus → ajusta pesos y tramos', 'Factor equipo → se aplica automáticamente', 'Los datos se actualizan en tiempo real'],
  },
]

export default function WizardOnboarding() {
  const { usuario, setUsuario } = useAuth()
  const [paso, setPaso] = useState(0)
  const [cerrando, setCerrando] = useState(false)

  const esDirectorAdmin = usuario?.rol === 'director' || usuario?.rol === 'admin'
  const pasos = esDirectorAdmin ? PASOS_DIRECTOR : PASOS_OPERARIO
  const esUltimoPaso = paso === pasos.length - 1
  const esSegundoPasoDirector = esDirectorAdmin && paso === 1

  const cerrar = async () => {
    setCerrando(true)
    try {
      await authApi.completarOnboarding()
      setUsuario(u => ({ ...u, onboarding_completado: true }))
    } catch {
      setUsuario(u => ({ ...u, onboarding_completado: true }))
    }
  }

  const pasoActual = pasos[paso]
  const Icon = pasoActual.icon
  const titulo = pasoActual.titulo.replace('{nombre}', usuario?.nombre || '')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gecotex-navy/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gecotex-navy to-gecotex-blue p-6 text-white relative">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center">
              <Icon size={28} className="text-white" />
            </div>
          </div>
          <h2 className="text-[16px] font-bold text-center leading-snug">{titulo}</h2>
          {/* Dots progress */}
          <div className="flex justify-center gap-2 mt-5">
            {pasos.map((_, i) => (
              <div key={i} className={clsx(
                'rounded-full transition-all duration-300',
                i === paso ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'
              )} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-[13.5px] text-gecotex-ink-sub leading-relaxed mb-5">{pasoActual.desc}</p>
          <ul className="space-y-2.5 mb-6">
            {pasoActual.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-gecotex-blue/10 text-gecotex-blue text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[13px] text-gecotex-ink leading-snug">{tip}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-3">
            <button
              onClick={cerrar}
              disabled={cerrando}
              className="flex-1 py-2.5 text-[13px] font-semibold text-gecotex-ink-muted hover:text-gecotex-ink border border-gecotex-border rounded-xl transition-colors"
            >
              Saltar intro
            </button>
            {esUltimoPaso ? (
              <button
                onClick={cerrar}
                disabled={cerrando}
                className="flex-1 btn-primary py-2.5 text-[13px]"
              >
                {cerrando ? 'Cargando...' : 'Ir al dashboard'}
              </button>
            ) : (
              <button
                onClick={() => setPaso(p => p + 1)}
                className="flex-1 btn-primary py-2.5 text-[13px] flex items-center justify-center gap-1.5"
              >
                Siguiente <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
