import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../shared/hooks/useAuth'

const PERFIL_LABEL = {
  admin: 'Admin',
  vendedor: 'Vendedor',
  financeiro: 'Financeiro',
}

export function TopBar({ aoAbrirMenu }) {
  const { perfil, logout } = useAuth()
  const nome = perfil?.nome || 'Usuário'
  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white/80 px-4 backdrop-blur-sm sm:px-6">
      <button
        onClick={aoAbrirMenu}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {iniciais}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-gray-800">{nome}</p>
            {perfil?.perfil && (
              <p className="text-xs text-gray-400">{PERFIL_LABEL[perfil.perfil] ?? perfil.perfil}</p>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 sm:px-2.5"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
