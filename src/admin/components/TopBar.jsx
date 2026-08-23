import { LogOut } from 'lucide-react'
import { useAuth } from '../../shared/hooks/useAuth'

export function TopBar() {
  const { perfil, logout } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {perfil?.nome || 'Usuário'}
          {perfil?.perfil ? ` · ${perfil.perfil}` : ''}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </header>
  )
}
