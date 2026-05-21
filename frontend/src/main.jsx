import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CronometroProvider } from './context/CronometroContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CronometroProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: 'Inter, sans-serif' },
              success: { iconTheme: { primary: '#27AE60', secondary: 'white' } },
              error: { iconTheme: { primary: '#C0392B', secondary: 'white' } },
            }}
          />
        </CronometroProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
