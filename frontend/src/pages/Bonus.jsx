import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Bonus() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/evaluaciones-bonus', { replace: true }) }, [navigate])
  return null
}
