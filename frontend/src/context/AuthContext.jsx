import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/client'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const stored = localStorage.getItem('gecotex_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('gecotex_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      authApi.me()
        .then(r => setUsuario(r.data))
        .catch(() => { setToken(null); setUsuario(null); localStorage.removeItem('gecotex_token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null)
      setUsuario(null)
    }
    window.addEventListener('gecotex:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('gecotex:unauthorized', handleUnauthorized)
  }, [])

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password)
    setToken(data.access_token)
    setUsuario(data.usuario)
    localStorage.setItem('gecotex_token', data.access_token)
    localStorage.setItem('gecotex_user', JSON.stringify(data.usuario))
    return data.usuario
  }

  const logout = () => {
    authApi.logout().catch(() => {})
    setToken(null)
    setUsuario(null)
    localStorage.removeItem('gecotex_token')
    localStorage.removeItem('gecotex_user')
    localStorage.removeItem('gecotex_sesion_activa')
  }

  const isAdmin = usuario?.rol === 'admin'
  const isDirector = usuario?.rol === 'director' || isAdmin
  const isCoordinador = usuario?.rol === 'coordinador' || isDirector
  const isOperario = usuario?.rol === 'operario'
  const canManageUsers = isAdmin
  const canSeeTeam = isCoordinador
  const canSeeBonus = isDirector
  const canConfigureBonus = isDirector

  return (
    <AuthContext.Provider value={{
      usuario, token, loading, login, logout,
      isAdmin, isDirector, isCoordinador, isOperario,
      canManageUsers, canSeeTeam, canSeeBonus, canConfigureBonus,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
