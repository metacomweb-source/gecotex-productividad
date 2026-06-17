import { Component } from 'react'
import React from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, retryKey: 0 }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message ?? String(this.state.error ?? 'Error desconocido')
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:'24px', textAlign:'center', fontFamily:'Inter,sans-serif' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'#FBE7E4', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#1A2233', marginBottom:8 }}>Algo ha ido mal en esta página</h2>
          <p style={{ fontSize:13, color:'#5B6577', marginBottom:8, maxWidth:440 }}>
            Se ha producido un error inesperado. Puedes intentar recargar la página o volver atrás.
          </p>
          <p style={{ fontSize:11, fontFamily:'monospace', color:'#8893A4', background:'#F4F6F9', border:'1px solid #E4E8EE', borderRadius:8, padding:'6px 16px', marginBottom:24, maxWidth:440, wordBreak:'break-all' }}>
            {msg}
          </p>
          <div style={{ display:'flex', gap:12 }}>
            <button
              onClick={() => window.history.back()}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1px solid #E4E8EE', background:'white', color:'#5B6577', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              ← Volver
            </button>
            <button
              onClick={() => this.setState(s => ({ error: null, retryKey: s.retryKey + 1 }))}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'none', background:'#1F3864', color:'white', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              ↺ Reintentar
            </button>
          </div>
        </div>
      )
    }

    return (
      <React.Fragment key={this.state.retryKey}>
        {this.props.children}
      </React.Fragment>
    )
  }
}
