import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Wallet,
  Megaphone,
  UserCog,
  Settings,
  Glasses,
} from 'lucide-react'

const itens = [
  { to: '/admin', fim: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/vendas', label: 'Vendas / OS', icon: ShoppingCart },
  { to: '/admin/estoque', label: 'Estoque', icon: Package },
  { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/admin/funcionarios', label: 'Funcionários', icon: UserCog },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-100 bg-white">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
          <Glasses size={18} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900">Ótica Monte Sinai</p>
          <p className="text-xs text-gray-400">Painel administrativo</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {itens.map(({ to, fim, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={fim}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.25 : 2}
                  className={isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
