import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gecotex_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gecotex_token')
      localStorage.removeItem('gecotex_user')
      localStorage.removeItem('gecotex_sesion_activa')
      window.dispatchEvent(new CustomEvent('gecotex:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// Expedientes
export const expedientesApi = {
  listar: (params) => api.get('/expedientes', { params }),
  obtener: (id) => api.get(`/expedientes/${id}`),
  crear: (data) => api.post('/expedientes', data),
  actualizar: (id, data) => api.put(`/expedientes/${id}`, data),
  eliminar: (id) => api.delete(`/expedientes/${id}`),
}

// Sesiones
export const sesionesApi = {
  iniciar: (expediente_id) => api.post('/sesiones/iniciar', { expediente_id }),
  pausar: (sesion_id) => api.post('/sesiones/pausar', { sesion_id }),
  finalizar: (sesion_id) => api.post('/sesiones/finalizar', { sesion_id }),
  activa: () => api.get('/sesiones/activa'),
  porExpediente: (id) => api.get(`/sesiones/expediente/${id}`),
}

// KPIs
export const kpisApi = {
  operario: (id, params) => api.get(`/kpis/operario/${id}`, { params }),
  equipo: (params) => api.get('/kpis/equipo', { params }),
  suficiencia: (params) => api.get('/kpis/suficiencia', { params }),
  ranking: (params) => api.get('/kpis/ranking', { params }),
}

// Tipos DUA
export const tiposDuaApi = {
  listar: () => api.get('/tipos-dua'),
  crear: (data) => api.post('/tipos-dua', data),
  actualizar: (id, data) => api.put(`/tipos-dua/${id}`, data),
  desactivar: (id) => api.delete(`/tipos-dua/${id}`),
}

// Incrementadores
export const incrementadoresApi = {
  listar: () => api.get('/incrementadores'),
  crear: (data) => api.post('/incrementadores', data),
  actualizar: (id, data) => api.put(`/incrementadores/${id}`, data),
}

// Objetivos
export const objetivosApi = {
  listar: (params) => api.get('/objetivos', { params }),
  crear: (data) => api.post('/objetivos', data),
  actualizar: (id, data) => api.put(`/objetivos/${id}`, data),
}

// Bonus
export const bonusApi = {
  config: (año) => api.get(`/bonus/config/${año}`),
  upsertConfig: (data) => api.put('/bonus/config', data),
  tabla: (año) => api.get(`/bonus/${año}`),
  operario: (id) => api.get(`/bonus/operario/${id}`),
}

// Usuarios
export const usuariosApi = {
  listar: () => api.get('/usuarios'),
  obtener: (id) => api.get(`/usuarios/${id}`),
  crear: (data) => api.post('/usuarios', data),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  desactivar: (id) => api.delete(`/usuarios/${id}`),
}

// Importación
export const importacionApi = {
  preview: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/importacion/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  ejecutar: (data) => api.post('/importacion/ejecutar', data),
  historial: () => api.get('/importacion/historial'),
}

// Informes
export const informesApi = {
  productividad: (params) => api.get('/informes/productividad-mensual', { params, responseType: 'blob' }),
  expedientes: (params) => api.get('/informes/expedientes', { params, responseType: 'blob' }),
  bonus: (params) => api.get('/informes/bonus-anual', { params, responseType: 'blob' }),
}

// Notificaciones
export const notificacionesApi = {
  listar: () => api.get('/notificaciones'),
  marcarLeida: (id) => api.put(`/notificaciones/${id}/leer`),
  marcarTodas: () => api.put('/notificaciones/leer-todas'),
}
