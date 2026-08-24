import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Carregando } from './EstadoTela'

const BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH !== 'false'

/**
 * Protege rotas por tipo de perfil. O controle real de acesso a dados
 * é feito pelo RLS no Supabase — este componente apenas evita que a
 * UI errada seja exibida antes da resposta do servidor.
 *
 * O bypass fica ligado por padrão (inclusive sem .env, ex: clone novo
 * do repositório ou deploy sem variáveis configuradas) para navegar no
 * painel sem login enquanto não há projeto Supabase real conectado.
 * Definir VITE_DEV_BYPASS_AUTH=false restaura a checagem normal de login
 * — fazer isso antes de conectar um Supabase real em produção, já que o
 * RLS ainda barra o acesso aos dados, mas a UI do painel ficaria visível
 * sem autenticação enquanto o bypass estiver ativo.
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
