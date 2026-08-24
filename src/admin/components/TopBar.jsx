import { LogOut } from 'lucide-react'
import { useAuth } from '../../shared/hooks/useAuth'

const PERFIL_LABEL = {
  admin: 'Admin',
  vendedor: 'Vendedor',
  financeiro: 'Financeiro',
}

export function TopBar() {
  const { perfil, logout } = useAuth()
  const nome = perfil?.nome || 'Usuário'
  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-sm">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {iniciais}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-gray-800">{nome}</p>
            {perfil?.perfil && (
              <p className="text-xs text-gray-400">{PERFIL_LABEL[perfil.perfil] ?? perfil.perfil}</p>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </header>
  )
}
