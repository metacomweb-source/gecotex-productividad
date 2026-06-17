import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useCelebraciones() {
  const { usuario } = useAuth()

  const celebrar = useCallback(async (tipo, datos = {}) => {
    if (!usuario || usuario.rol !== 'operario') return

    if (tipo === 'objetivo_mes') {
      const now = new Date()
      const key = `confeti_mes_${now.getFullYear()}_${now.getMonth() + 1}_${usuario.id}`
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')

      try {
        const confetti = (await import('canvas-confetti')).default
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#1F3864', '#2E75B6', '#27AE60', '#F39C12'],
        })
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['#1F3864', '#2E75B6'],
          })
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['#27AE60', '#F39C12'],
          })
        }, 400)
      } catch {}
      toast.success('¡Has superado tu objetivo mensual!', { duration: 5000, icon: '🎉' })
    }

    if (tipo === 'primer_expediente') {
      const ups = datos.ups != null ? datos.ups.toFixed(1) : '?'
      toast.success(`¡Primer expediente registrado! Ya tienes ${ups} UPs hoy.`, {
        duration: 4000,
        icon: '🚀',
      })
    }

    if (tipo === 'bonus_cerrado') {
      const importe = datos.bonus != null
        ? datos.bonus.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
        : null
      try {
        const confetti = (await import('canvas-confetti')).default
        const end = Date.now() + 5000
        const frame = () => {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#1F3864', '#27AE60', '#F39C12'] })
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#1F3864', '#27AE60', '#F39C12'] })
          if (Date.now() < end) requestAnimationFrame(frame)
        }
        frame()
      } catch {}
      toast.success(
        importe ? `Bonus semestral confirmado: ${importe}` : '¡Evaluación semestral cerrada!',
        { duration: 6000, icon: '🏆' }
      )
    }
  }, [usuario])

  return { celebrar }
}
