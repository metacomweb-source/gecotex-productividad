import { Component } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-16 h-16 bg-gecotex-red-soft rounded-full flex items-center justify-center mb-5">
            <AlertTriangle size={28} className="text-gecotex-red" />
          </div>
          <h2 className="text-xl font-bold text-gecotex-ink mb-2">Algo ha ido mal en esta página</h2>
          <p className="text-sm text-gecotex-ink-sub mb-1 max-w-md">
            Se ha producido un error inesperado. Puedes intentar recargar la página o volver atrás.
          </p>
          <p className="text-xs font-mono text-gecotex-ink-muted bg-gecotex-bg border border-gecotex-border rounded-lg px-4 py-2 mb-6 max-w-md break-all">
            {this.state.error.message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gecotex-border text-gecotex-ink-sub text-sm font-semibold hover:bg-gecotex-bg transition-colors"
            >
              <ArrowLeft size={16} /> Volver
            </button>
            <button
              onClick={() => this.setState({ error: null })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gecotex-navy text-white text-sm font-semibold hover:bg-gecotex-navy-dark transition-colors"
            >
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
