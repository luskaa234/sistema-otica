import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Carregando } from './EstadoTela'

/**
 * Protege rotas por tipo de perfil. O controle real de acesso a dados
 * é feito pelo RLS no Supabase — este componente apenas evita que a
 * UI errada seja exibida antes da resposta do servidor.
 */
export function RotaProtegida({ perfilPermitido, children }) {
  const { logado, perfil, carregando } = useAuth()

  if (carregando) return <Carregando texto="Verificando sessão..." />
  if (!logado) return <Navigate to="/" replace />
  if (!perfil || perfil.tipo !== perfilPermitido) return <Navigate to="/" replace />

  return children
}
