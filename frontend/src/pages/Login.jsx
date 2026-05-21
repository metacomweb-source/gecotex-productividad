import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Introduce email y contraseña'); return }
    setLoading(true)
    try {
      const usuario = await login(email, password)
      toast.success(`Bienvenido, ${usuario.nombre}`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gecotex-navy-darker via-gecotex-navy to-[#244a7e] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Abstract Grid Background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="white" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
      
      {/* Radial Glows */}
      <div className="absolute -left-40 -top-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(46,117,182,0.32)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute -right-56 -bottom-56 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(46,117,182,0.20)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10 animate-fade-in">
        {/* Brand top-left (visible on desktop) */}
        <div className="hidden lg:block absolute -top-24 -left-4">
          <div className="flex flex-col gap-1">
            <img src="/assets/gecotex-white.png" alt="Gecotex" className="h-9 w-auto object-contain" />
            <span className="text-[10px] font-medium text-white/55 tracking-[0.22em] pl-1">INTERNACIONAL</span>
          </div>
        </div>

        {/* Brand for mobile */}
        <div className="lg:hidden text-center mb-10">
          <img src="/assets/gecotex-white.png" alt="Gecotex" className="h-10 w-auto mx-auto mb-1" />
          <p className="text-[10px] font-medium text-white/55 tracking-[0.22em]">INTERNACIONAL</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.04)] p-10 sm:p-11">
          <h1 className="text-[22px] font-bold text-gecotex-ink tracking-tight">Bienvenido de nuevo</h1>
          <p className="text-[13.5px] text-gecotex-ink-sub mt-1.5">Accede a tu panel de productividad</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-gecotex-ink tracking-wide">Correo electrónico</label>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gecotex-bg border border-gecotex-border rounded-lg transition-all focus-within:border-gecotex-blue focus-within:ring-2 focus-within:ring-gecotex-blue/10">
                <LogIn size={16} className="text-gecotex-ink-muted" />
                <input
                  type="email"
                  className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-gecotex-ink placeholder:text-gecotex-ink-muted"
                  placeholder="usuario@gecotex.es"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-gecotex-ink tracking-wide">Contraseña</label>
                <button type="button" className="text-[11.5px] text-gecotex-blue font-medium hover:underline">¿Olvidaste tu contraseña?</button>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gecotex-bg border border-gecotex-border rounded-lg transition-all focus-within:border-gecotex-blue focus-within:ring-2 focus-within:ring-gecotex-blue/10">
                <Eye size={16} className="text-gecotex-ink-muted cursor-pointer hover:text-gecotex-ink" onClick={() => setShowPwd(!showPwd)} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-gecotex-ink placeholder:text-gecotex-ink-muted"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-gecotex-ink-sub mt-4 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-gecotex-border accent-gecotex-navy" />
              <span>Mantener sesión iniciada</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gecotex-navy text-white rounded-lg text-sm font-semibold tracking-wide shadow-[0_6px_16px_rgba(31,56,100,0.27)] hover:bg-gecotex-navy-dark transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : 'Entrar'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 pt-6 border-t border-gecotex-border-soft">
            <p className="text-[11px] font-semibold text-gecotex-ink-muted uppercase tracking-widest mb-3">Credenciales de demo</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { rol: 'Admin', email: 'admin@gecotex.es', pwd: 'admin123' },
                { rol: 'Operario', email: 'cristian@gecotex.es', pwd: 'demo123' },
              ].map(cred => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => { setEmail(cred.email); setPassword(cred.pwd) }}
                  className="text-left p-2.5 bg-gecotex-bg hover:bg-gecotex-border-soft rounded-lg transition-colors border border-transparent hover:border-gecotex-border"
                >
                  <p className="text-[11px] font-bold text-gecotex-blue">{cred.rol}</p>
                  <p className="text-[10px] text-gecotex-ink-muted truncate">{cred.email}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[12px] text-gecotex-ink-muted">
              ¿Problemas para acceder? Contacta con <span className="text-gecotex-blue font-semibold cursor-pointer">soporte@gecotex.com</span>
            </p>
          </div>
        </div>

        <p className="text-white/40 text-[11px] text-center mt-10 tracking-[0.08em] uppercase">
          GECOTEX INTERNACIONAL · AGENCIA DE ADUANAS · V 2.4.1
        </p>
      </div>
    </div>
  )
}

