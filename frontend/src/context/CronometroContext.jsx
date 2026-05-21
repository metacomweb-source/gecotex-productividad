import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { sesionesApi } from '../api/client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const CronometroContext = createContext(null)

export function CronometroProvider({ children }) {
  const { usuario } = useAuth()
  const [sesionActiva, setSesionActiva] = useState(() => {
    try {
      const s = localStorage.getItem('gecotex_sesion_activa')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })
  const [segundos, setSegundos] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!usuario) {
      setSesionActiva(null)
      localStorage.removeItem('gecotex_sesion_activa')
      return
    }
    sesionesApi.activa()
      .then(r => {
        setSesionActiva(r.data)
        localStorage.setItem('gecotex_sesion_activa', JSON.stringify(r.data))
      })
      .catch(() => {
        setSesionActiva(null)
        localStorage.removeItem('gecotex_sesion_activa')
      })
  }, [usuario])

  useEffect(() => {
    if (sesionActiva?.estado === 'activa') {
      const inicio = new Date(sesionActiva.inicio).getTime()
      const tick = () => setSegundos(Math.floor((Date.now() - inicio) / 1000))
      tick()
      intervalRef.current = setInterval(tick, 1000)
    } else {
      clearInterval(intervalRef.current)
      setSegundos(0)
    }
    return () => clearInterval(intervalRef.current)
  }, [sesionActiva])

  const iniciar = async (expediente_id, numero_expediente) => {
    const { data } = await sesionesApi.iniciar(expediente_id)
    const sesion = { ...data, numero_expediente }
    setSesionActiva(sesion)
    localStorage.setItem('gecotex_sesion_activa', JSON.stringify(sesion))
    toast.success('Cronómetro iniciado')
    return data
  }

  const pausar = async () => {
    if (!sesionActiva) return
    await sesionesApi.pausar(sesionActiva.id)
    setSesionActiva(null)
    localStorage.removeItem('gecotex_sesion_activa')
    toast('Cronómetro pausado', { icon: '⏸️' })
  }

  const finalizar = async () => {
    if (!sesionActiva) return
    await sesionesApi.finalizar(sesionActiva.id)
    setSesionActiva(null)
    localStorage.removeItem('gecotex_sesion_activa')
    toast.success('Sesión de trabajo completada')
  }

  const formatearTiempo = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0')
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  return (
    <CronometroContext.Provider value={{ sesionActiva, segundos, iniciar, pausar, finalizar, formatearTiempo }}>
      {children}
    </CronometroContext.Provider>
  )
}

export const useCronometro = () => {
  const ctx = useContext(CronometroContext)
  if (!ctx) throw new Error('useCronometro must be inside CronometroProvider')
  return ctx
}
