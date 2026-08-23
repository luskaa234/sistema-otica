import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Carregando } from './EstadoTela'

const BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

/**
 * Protege rotas por tipo de perfil. O controle real de acesso a dados
 * é feito pelo RLS no Supabase — este componente apenas evita que a
 * UI errada seja exibida antes da resposta do servidor.
 *
 * VITE_DEV_BYPASS_AUTH=true pula essa checagem para navegar no painel
 * sem login durante o desenvolvimento (sem projeto Supabase configurado).
 * NUNCA habilitar em produção — o RLS ainda barra o acesso aos dados,
 * mas a UI do painel ficaria visível sem autenticação.
 */
export function RotaProtegida({ perfilPermitido, children }) {
  const { logado, perfil, carregando } = useAuth()
  const caminhoLogin = perfilPermitido === 'cliente' ? '/app/login' : '/'

  if (BYPASS_AUTH) return children

  if (carregando) return <Carregando texto="Verificando sessão..." />
  if (!logado) return <Navigate to={caminhoLogin} replace />
  if (!perfil || perfil.tipo !== perfilPermitido) return <Navigate to={caminhoLogin} replace />

  return children
}
